var validate    = require('../validate/validate.js'),
    mongoClient = require('mongodb').MongoClient;

function Driver(config, callback) {
    var self  = this,
        login = '';

    // validate config
    if (!validate(config).isTruthy().result) {
        throw new Error('INVALID_CONFIG');
    }
    if (!validate(config).has('host').isString({notempty: true}).result) {
        throw new Error('MISSING_HOST');
    }
    if (!validate(config).has('port') && validate(config).has('port').isNumber({integer: true, unsigned: true, between: [1,65535]}).result) {
        throw new Error('MISSING_PORT');
    }
    if (validate(config).has('username') && !validate(config).has('username').isString({notempty: true}).result) {
        throw new Error('MISSING_USER');
    }
    if (validate(config).has('password') && !validate(config).has('password').isString({notempty: true}).result) {
        throw new Error('MISSING_PASS');
    }
    if (!validate(config).has('database').isString({notempty: true}).result) {
        throw new Error('MISSING_DATABASENAME');
    }

    self.state  = 'initializing';
    self.config = {
        host: config.host,
        port: config.port || 27017,
        database: config.database
    };

    // build mongo db url
    if (config.username) {
        self.config.username = config.username;
        login = config.username;
    }
    if (config.password) {
        self.config.password = config.password;
        login += (config.username || 'anonymous') + ":" + config.password;
    }
    self.url = 'mongodb://' + (login ? login + '@' : '') + config.host + ':' + (config.port || 27017) + '/' + config.database;

    self.connection = mongoClient.connect(self.url, (err, db) => {
        self.database = db;
        if (err) {
            this.shutdown('error');
        } else {
            this.state = 'ready';
        }
        callback(err, self);
    });
}
Driver.prototype = {
    createTable: function (tablelist, ... params) {

        function create(err, existingTables, tablesToCreate, options, cb) {
            if (err) {
                cb(err);

            } else if (tablesToCreate.length === 0) {
                cb(null, this);

            } else {
                var table = tablesToCreate.shift();

                // validate the table name
                if (existingTables.indexOf(table) > -1 && options.skipIfExists !== true) {
                    cb({
                        "error": "TABLE_ALREADY_EXISTS",
                        "table": table
                    }, this);

                // attempt to create table
                } else {
                    this.database.createCollection(table, (err) => {
                        create(err, existingTables, tablesToCreate, options, cb);
                    });
                }
            }
        }

        var tablesToCreate = [],
            options = {},
            callback;

        if (params.length > 2) {
            options = params[2];
            callback = params[3];
        } else {
            callback = params[2] || function () {};
        }

        if (this.status() !== 'ready') {
            callback('NOT_READY');
            return;
        }

        if (!validate(tablelist).isArray().result) {
            tablelist = [tablelist];
        }
        try {
            tablelist.forEach((item) => {
                if (!validate(item).isObject().has("name").isString({notempty: true}).result) {
                    throw new Error("INALID_TABLE_NAME");
                } else if (!validate(item).has("fields").isArray({notempty: true}).result) {
                    throw new Error("NO_FIELDS");
                } else if (!validate(item).isString({match: /^[a-z\d\/]+$/i}).result) {
                    throw new Error('INVALID_TABLE_NAME');
                } else {
                    tablesToCreate.push(item.name.toLowerCase());
                }
            });

            this.database.listCollections().toArray((err, existingTables) => {
                if (err) {
                    callback(err);
                } else {
                    create(null, existingTables, tablesToCreate, options, callback);
                }
            });
        } catch (e) {
            callback(e);
        }
    }
};
module.exports = Driver;
