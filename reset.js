var path      = require('path'),
    args      = require('yargs').argv,
    validate  = require('./lib/common/validate.js'),
    config    = require('./lib/common/config.js'),
    winston   = require('winston');

winston.level = 'info';

module.exports = (options) => {

    config.init(options);

    var database;
    // initialize the database handler module
    return require('./lib/common/database-handler.js').init().then((db) => {
        database = db;
        function drop(collections) {
            if (collections.length) {
                var collection = collections.shift().name;
                winston.info("Dropping: " + collection);
                return database.dropCollection(collection).then(() => {
                    winston.info("Dropped: " + collection);
                    return drop(collections);
                });
            }
        }

        return database.listCollections({}).toArray().then((collections) => {
            winston.info("Retrieved collection list");
            return drop(collections);
        });
    }).then(() => {
        winston.info("Finished removing collections");
        database.close();
    }).catch((e) => {
        winston.error(e);
        database.close();
    });
};

// if this module was called as the main entry module(from the command line)
// then attempt to compile the config and call the initialization function
if (require.main === module) {

    // configuration store
    var options = {};

    // Command line argument: -bearnbotcfg
    //     If specified the default config location is used to retrieve the
    //     configuration
    if (args.bearnbotcfg == true) {
        options = require(path.join(__dirname, './config/config.json'));

    // Command line argument: -bearnbot={file}
    //     If specified then indicated {file} is the path to the configuration
    //     file
    } else if (validate(args.bearnbotcfg).isString({notempty: true}).result) {
        options = require(path.resolve(args.bearnbotcfg));

    // If no command line argument is specified
    //     The configuration is assumed to be stored as process enviornment
    //     variables, formated as:
    //
    //     BEARNBOT_{SECTION_}{FIELD}
    } else {
        Object.keys(process.env).forEach((item) => {
            var match = item.match(/^BEARNBOT_(?:([A-Z]+)(?:_|$))([A-Z_]+)$/);
            if (match) {
                var section = match[1].toLowerCase(),
                    field   = match[2].toLowerCase();

                if (field.length) {
                    if (!Object.prototype.hasOwnProperty.call(options, section)) {
                        options[section] = {};

                    } else if (!validate(options).has(section).isObject().result) {
                        throw new Error("INVALID_CONFIG");
                    }
                    options[section][field] = process.env[item];
                } else {
                    options[section] = process.env[item];
                }
            }
        });
    }
    module.exports(options).then((res) => {
        winston.info(res);

    }).catch((err) => {
        winston.error(err);
    });
}
