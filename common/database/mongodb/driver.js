var validate = require('../validate/validate.js'),
    mongoClient = require('mongodb').MongoClient,
    structure = require('../structure.json');

/**
 * @access public
 * @param {Object} config
 * @param {String} config.host
 * @param {Number} config.port
 * @param {String} config.username
 * @param {String} config.password
 * @param {String} config.database
 * @return {Driver}
 */
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

    // validate config
    if (!validate(config).isTruthy().result) {
        throw new Error("INVALID_CONFIG");
    }
    if (!validate(config).has('host').isString({notempty: true}).result) {
        throw new Error("MISSING_HOST");
    }
    if (!validate(config).has('port') && validate(config).has('port').isNumber({integer: true, unsigned: true, between: [1,65535]}).result) {
        throw new Error("MISSING_PORT");
    }
    if (validate(config).has('username') && !validate(config).has('username').isString({notempty: true}).result) {
        throw new Error("MISSING_USER");
    }
    if (validate(config).has('password') && !validate(config).has('password').isString({notempty: true}).result) {
        throw new Error("MISSING_PASS");
    }
    if (!validate(config).has('database').isString({notempty: true}).result) {
        throw new Error("MISSING_DATABASENAME");
    }
    if (!validate(structure).isTruthy().result || !Object.keys(structure).length) {
        throw new Error("INVALID_DATABASE_STRUCTURE");
    }


    // build mongo db url
    if (config.username) {
        login = config.username;
    }
    if (config.password) {
        login += (config.username || "anonymous") + ":" + config.password;
    }
    self.url = url + (login ? login + '@' : '') + config.host + ":" + (config.port || 27017) + '/' + config.database;

    // attempt connection
    self.connection = mongoClient.connect(url, (err, db) => {
        if (err) {
            this.shutdown('error');
            callback(err, self);

        // if no errors, attempt to create tables/collections;
        } else {
            self.database = db.db(config.database);
            tables = Object.keys(structure);
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
