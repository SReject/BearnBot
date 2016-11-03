// TODO : Setup logging via winston based on config

var path      = require('path'),
    args      = require('yargs').argv,
    Promise   = require('bluebird'),

    config    = require('./lib/common/config.js'),
    logger    = require('./lib/common/logger.js'),
    validate  = require('./lib/common/validate.js');

module.exports = (options) => {

    // base resolution of which the main promise will resolve with
    var resolution = {
        website: new Promise((resolve) => resolve()),
        chatbot: new Promise((resolve) => resolve())
    };

    // validate the input config
    config.init(options);
    config = config.get();

    // initialize the logger
    logger.init(config.logging);

    // if neither the webserver nor the chatbot should be loaded; resolve with
    // the stock resolution
    if (!config.webserver.enable && !config.chatbot.enable) {
        logger.debug('Webserver and chatbot are disabled; No work to do');
        return new Promise((resolve) => resolve(resolution));
    }

    // return a new promise that will be resolved once all components are
    // initialized
    return new Promise((resolve, reject) => {
        logger.info("Initializing...");

        // initialize the oauth2 library
        //     By calling it here the specified configuration will presist into
        //     subsequent require()'s of the oauth2.js module
         require('./lib/common/oauth2.js')({
            authorizeurl : 'https://beam.pro/oauth/authorize',
            tokenurl     : 'https://beam.pro/api/v1/oauth/token',
            clientid     : config.api.clientid,
            clientsecret : config.api.clientsecret,
            redirecturi  : (config.ssl ? 'https://' : 'http://') + config.domain + '/login/code'
        });


        // initialize the database handler module
        require('./lib/common/database-handler.js').init().then(() => {
            // return pluginmgr.init();

        // then initialize the website and chat bot respecting configuration
        }).then(() => {
            if (config.webserver.enable) {
                resolution.webserver = require('./lib/webserver/')();
            }
            if (config.chatbot.enable) {
                resolution.chatbot = require('./lib/chatbot/')();
            }

            // Resolve the main Promise
            resolve(resolution);

        // if anything throws an error or rejects their promise then reject the
        // main promise
        }).catch((e) => {
            logger.error("Startup failed: ");
            logger.error(e);
            reject(e);
        });
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
    if (args.bearnbotcfg === true) {
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

    // Call the initialization function
    module.exports(options).then((components) => {

        // if the web server is enabled wait for it to finish loading then
        // output a message indicating such
        if (config.webserver.enable) {
            components.webserver.catch((e) => {
                logger.error("Unable to start website:");
                logger.error(e);
            });
        }

        // if the chatbot is enabled wait for it to finish loading then output a
        // message indicating such
        if (config.chatbot.enable) {
            components.chatbot.catch((e) => {
                logger.error("Unable to start chatbot:");
                logger.error(e);
            });
        }

    });
}
