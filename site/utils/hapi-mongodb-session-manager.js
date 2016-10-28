var hoek        = require('hoek'),
    randBytes   = require('crypto').randomBytes,
    MongoClient = require('mongodb').MongoClient,
    validate    = require('../../common/validate.js'),
    internals = {};

// default configuration values
internals.defaults = {
    name: 'uid',
    lifespan: 24 * 60 * 60 * 1000,
    cookieOptions: {
        clearInvalid: false,
        isSecure:     false
    },
    database: {
        'address'   : 'mongodb://127.0.0.1/test',
        'collection': 'sessions',
        'persist'   : false
    }
};

// simple wrapped function
internals.getState = () => {
    return {};
};

// connects to a database
internals.connect = (settings, callback) => {
    function collectionCheck(database, collection, cb) {
        database.listCollections({name: collection}).toArray((err, res) => {
            if (err) {
                cb(err);
            } else if (res.length > 0) {
                cb(null);
            } else {
                database.createCollection(collection, (err) => {
                    cb(err);
                });
            }
        });
    }


    if (settings.database.handler) {
        collectionCheck(settings.database.handler, settings.database.collection, callback);

    } else if (settings.database.persist && internals._database) {
        collectionCheck(internals._database, settings.database.collection, callback);

    } else {

        var handler = new MongoClient();
        handler.connect(settings.database.address, (err, database) => {
            if (err) {
                handler.close();
                return callback(err);
            }
            collectionCheck(database, settings.database.collection, (err) => {
                if (err) {
                    callback(err);
                } else {
                    callback(null, database);

                    if (settings.database.persist) {
                        internals._database = database;
                    } else {
                        database.close();
                    }
                }
            });
        });
    }
};

// retrieves stored session data
internals.retrieve = (database, collection, id, lifespan, cb) => {
    database.collection(collection, (err, col) => {
        if (err) {
            cb(err);
        } else {
            col.find({'id': id}).toArray((err, items) => {
                if (err) {
                    cb(cb);
                } else if (!items.length) {
                    cb(null, {});
                } else if (items[0].expires >= Date.now()) {
                    cb(null, JSON.parse(items[0].data));
                } else {
                    col.remove({'id': id}, (err) => {
                        cb(err, {});
                    });
                }
            });
        }
    });
};

// stores session data related to the id
internals.store = (database, collection, id, expires, data, callback) => {
    if (!Object.keys(data).length) {
        return database[collection].remove({'id': id}, callback);
    }
    database[collection].update(
        {'id': id},
        {
            $set: {
                data: JSON.stringify(data),
                date: Date.now() + expires
            }
        },
        {upsert: true},
        callback
    );
};

// generates a unique session id
internals.generateId = (database, collection, callback) => {
    var id = randBytes(64).toString('hex');
    database.collection(collection, (err, col) => {
        if (err) {
            callback(err);
        } else {
            col.find({'id': id}).toArray((err, items) => {
                if (err) {
                    callback(err);
                } else if (items.length > 0) {
                    internals.generateId(database, collection, callback);
                } else {
                    callback(null, id);
                }
            });
        }
    })
};

// Register function for hapi's plugin system
exports.register = function (server, options, next) {
    var settings      = hoek.applyToDefaults(internals.defaults, options),
        cookieOptions = hoek.clone(settings.cookieOptions);

    cookieOptions.encoding = 'none';
    cookieOptions.ttl = settings.lifespan;

    server.state(settings.name, settings.cookieOptions);
    server.decorate('request', 'hmdbs', internals.getState, {apply: true});

    server.ext('onPreAuth', (request, reply) => {
        if (hoek.reach(request, 'route.settings.plugins.hmdbs.skip')) {
            return reply.continue();
        }

        // stores data under the specified key
        request.hmdbs.set = (key, value) => {
            if (validate(key).isString({notempty: true}).result) {
                request.hmdbs._modified = true;
                request.hmdbs._data[key] = value || null;
            }
            // raise error/warning about the key not being a string
        };

        // returns a value for the specified key
        request.hmdbs.get = (key) => {
            if (request.hmdbs._data.hasOwnProperty(key)) {
                return request.hmdbs._data[key];
            }
            return null;
        };

        // removes the specified key
        request.hmdbs.unset = (key) => {
            delete request.hmdbs._data[key];
            request.hmdbs._modified = true;
        };

        // resets associated data to an empty object
        // If the data object is empty when the data is to be stored in the
        // database, the entry will intead be deleted
        request.hmdbs.reset = () => {
            request.hmdbs._data     = {};
            request.hmdbs._modified = true;
        };

        var sessionid = request.state[settings.name];
        internals.connect(settings, (err, database) => {
            if (err) {
                return reply(err);
            } else if (!sessionid) {
                internals.generateId(database, settings.database.collection, (err, id) => {
                    if (err) {
                        reply(err);
                    } else {
                        request.hmdbs.id = id;
                        request.hmdbs._modified = false;
                        request.hmdbs._data = {};
                        reply.continue();
                    }
                });
            } else {
                internals.retrieve(
                    database,
                    settings.database.collection,
                    sessionid,
                    settings.lifespan,
                    (err, data) => {
                        if (err) {
                            reply(err);
                        } else {
                            request.hmdbs.id = sessionid
                            request.hmdbs._modified = false;
                            request.hmdbs._data = data;
                            reply.continue();
                        }
                    }
                );
            }
        });
    });

    server.ext('onPreResponse', (request, reply) => {
        reply.state(settings.name, request.hmdbs.id, cookieOptions);
        if (!request.hmdbs._modified) {
            reply.continue();
        } else {
            internals.connect(settings, (err, database) => {
                if (err) {
                    reply(err);
                } else {
                    internals.store(database, settings.database.collection,  (err) => {
                        if (err) {
                            reply(err);
                        } else {
                            reply.continue();
                        }
                    });
                }
            });
        }
    });

    next();
};
exports.register.attributes = {
    name:    'hmdbs',
    version: '1.0.0',
    author:  'SReject'
};
