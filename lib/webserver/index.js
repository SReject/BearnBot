/** webserver/index.js
  *     This code part of the https://github.com/SReject/bearnbot project.
  *     All rights reserved; see site for licensing
  *
  * Spawns the webserver instance for bearnbot
  */

var path    = require('path'),
    hapi    = require('hapi'),
    Promise = require("bluebird"),
    logger  = require('../common/logger.js'),
    config  = (require('../common/config.js')).get();

/** Spawns the webserver instance
  * @access public
  * @returns {Promise.<>}
  */
module.exports = function () {
    // attempt to connect to the database
    logger.info("[WebServer] Initializing");

    // A list of plugins to register with the webserver and the options
    // that will be passed to the plugin during registration
    var server,
        plugins = [

            // Session manager
            {register: require('./utils/session-manager.js')},

            // User authorization plugins
            {register: require('./utils/account-manager.js')},

            // Static directory/folder server
            {register: require('inert')},

            // Template engine facilitater
            {register: require('vision')}
        ];

    // create a new hapi server instance
    server = new hapi.Server();
    server.connection({
        port:    config.webserver.port,
        address: config.webserver.address
    });

    // register Hapi-Server plugins
    logger.verbose("[WebServer] Registering Hapi plugins");
    return (new Promise((resolve, reject) => {
        server.register(plugins, (err, res) => {
            if (err) {
                logger.error("[WebServer] Failed To register Hapi plugins: " + err);
                reject(err);
            } else {
                resolve(res);
            }
        });

    // start server
    })).then(() => {
        logger.verbose("[WebServer] Hapi plugins registered");

        // set the default authorization strategy to that provided by accounts.js
        logger.verbose("[WebServer] Defining authorization strategy");
        server.auth.strategy('auth', 'accountmanager');
        server.auth.default('auth');
        logger.verbose("[WebServer] Authorization strategy defined");

        // register the handlebars view templating engine
        logger.verbose("[WebServer] Configuring views engine");
        server.views({
            engines: {
                html: require('handlebars'),
            },
            path:         path.join(__dirname, 'www'),
            layoutPath:   path.join(__dirname, 'www/layouts'),
            partialsPath: path.join(__dirname, 'www/partials'),
            layout:       path.join('default')
        });
        logger.verbose("[WebServer] Views engine configured");

        // Load routes
        return require('./utils/router.js')(server);
    }).then(() => {
        // start the server
        logger.info("[WebServer] Starting server");
        return new Promise((resolve, reject) => {
            server.start((err) => {
                if (err) {
                    logger.error("[WebServer] Start Failed:");
                    logger.error(err);
                    reject(err);

                } else {
                    logger.info("[WebServer] Started");
                    resolve(server);
                }
            });
        });
    });
};
