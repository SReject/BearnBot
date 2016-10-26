var validate = require('../validate/validate.js'),
    mongoClient = require('mongodb').MongoClient,
    dbstructure = require('../structure.json');

function Driver(config, callback) {
    var self = this,
        url = "mongodb://",
        login = '',
        tables = [];

    self.state = 'initializing';

    function next(item) {
        if (item !== undefined) {
            self.database.listCollections({name: item}).toArray((err, items) => {
                if (err) {
                    this.shutdown('error');
                    callback(err, self);
                } else {
                    if (!items.length) {
                        self.database.createCollection(item, (err) => {
                            if (err) {
                                this.shutdown('error');
                                callback(err, self);
                            } else {
                                next(tables.shift());
                            }
                        });
                    } else {
                        next(tables.shift());
                    }
                }
            });
        } else {
            this.state = 'ready';
            callback(false, self);
        }
    }

    if (!validate(config).isTruthy().result) {
        throw new Error("INVALID_CONFIG");
    }
    if (!validate(config).has('host').isString({notempty: true}).result) {
        throw new Error("MISSING_HOST");
    }
    if (!validate(config).has('port') && validate(config).has('port').isNumber({integer: true, unsigned: true, between: [1,65535]}).result) {
        throw new Error("MISSING_PORT");
    }
    if (validate(config).has('user') && !validate(config).has('user').isString({notempty: true}).result) {
        throw new Error("MISSING_USER");
    }
    if (validate(config).has('pass') && !validate(config).has('pass').isString({notempty: true}).result) {
        throw new Error("MISSING_PASS");
    }
    if (!validate(config).has('database').isString({notempty: true}).result) {
        throw new Error("MISSING_DATABASENAME");
    }
    if (!validate(dbstructure).isTruthy().result || !Object.keys(dbstructure).length) {
        throw new Error("INVALID_DATABASE_STRUCTURE");
    }


    // build mongo db url
    if (config.user) {
        login = config.user;
    }
    if (config.pass) {
        if (!config.user) {
            login = "anonymous";
        }
        login += ":" + config.pass;
    }
    self.url = url + (login ? login + '@' : '') + config.host + ":" + (config.port || 27017) + '/' + config.database;

    self.connection = mongoClient.connect(url, (err, db) => {
        if (err) {
            this.shutdown('error');
            callback(err, self);
        } else {
            self.database = db.db(config.database);
            tables = Object.keys(dbstructure);
            next(tables.shift());
        }
    });
}
Driver.prototype = {
    shutdown: function (state) {
        this.connection.close();
        delete this.connection;
        delete this.database;
        if (state) {
            this.state = state;
        }
    },
    status: function () {
        return this.state;
    }
};
module.exports = Driver;
