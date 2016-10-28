var path         = require('path'),
    Hapi         = require('hapi'),
    vision       = require('vision'),
    handlebars   = require('handlebars'),
    sessions     = require('./utils/hapi-mongodb-session-manager.js'),
    apiRoutes    = require('./routing/api.js'),
    staticRoutes = require('./routing/static.js'),

    validate     = require('../common/validate.js');

module.exports = function (config, cb) {
    var options = {},
        siteconfig,
        server;

    if (!validate(config).has('site').result) {
        cb(new Error('SITE_CONFIG_MISSING'));
        return;
    }

    siteconfig = config.site;

    // validate config.address
    if (!validate(siteconfig).has('address').result) {
        options.address = 'localhost';
    } else if (!validate(siteconfig.address).isString({notempty: true}).result) {
        cb(new Error('INVALID_ADDRESS'));
        return;
    } else {
        options.address = siteconfig.address;
    }

    // validate config.port
    if (!validate(siteconfig).has('port').result) {
        options.port = 80;
    } else if (!validate(siteconfig.port).isNumber({integer: true, unsigned: true, between:[1, 65535]}).result) {
        return cb(new Error('INVALID_PORT'));
    } else {
        options.port = siteconfig.port;
    }

    // create server instance
    server = new Hapi.Server();
    server.connection(options);


    // register session manager and vision templating
    server.register([
        {
            register: sessions,
            options: {
                database: config.database
            }
        }, {
            register: vision
        }
    ], (err) => {
        if (err) {
            cb(err);
        }
        else {

            // register handlebar's templator
            server.views({
                engines: {
                    html: handlebars,
                },
                path:         path.join(__dirname, 'www'),
                layoutPath:   path.join(__dirname, 'www/layouts'),
                partialsPath: path.join(__dirname, 'www/partials'),
                layout:       path.join('default')
            });

            // register routes
            staticRoutes(server, config);
            apiRoutes(server, config);

            // start server listening
            server.start((err) => {
                if (err) {
                    cb(err);
                } else {
                    cb();
                }
            });
        }
    });
}
