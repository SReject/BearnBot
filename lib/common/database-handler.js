var Promise     = require('bluebird'),
    MongoClient = require('mongodb').MongoClient,
    config,
    dbClient,
    database;

module.exports = {};
module.exports.init = () => {
    config = require('./config.js').get();

    var dbsettings = config.database,
        url = "mongodb://" +
            (dbsettings.username ? (dbsettings.username + ":" + dbsettings.password + "@") : '') +
            dbsettings.address + ":" + (dbsettings.port || 27017) + "/" + dbsettings.database;

    dbClient = new MongoClient();
    return dbClient.connect(url, {
        server: {
            poolSize: 20,
            reconnectTries: 100,
            reconnectInterval: 1000,
        }
    }).then((db) => {
        database = db;
        return database;
    });
};

module.exports.getCollection = (name, options) => {
    options = options || {};

    var retrieve = new Promise((resolve, reject) => {
        database.collection(name, (err, collection) => {
            if (err) {
                reject(err);
            } else {
                resolve(collection);
            }
        });
    });

    return retrieve.then((collection) => {
        if (collection) {
            return collection;

        } else if (options.create) {
            database.createCollection(name).then(() => {
                return new Promise((resolve, reject) => {
                    database.collection(name, (err, collection) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(collection);
                        }
                    });
                });
            });
        }
    });
};
