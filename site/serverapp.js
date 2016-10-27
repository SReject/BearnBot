var path         = require('path'),
    Hapi         = require('hapi'),
    vision       = require('vision'),
    handlebars   = require('handlebars'),
    apiRoutes    = require('./routing/api.js'),
    staticRoutes = require('./routing/static.js'),
    validate     = require('../common/validate/validate.js');

module.exports = function (config, cb) {
    var options = {},
        server;

    // validate config.address
    if (!validate(config).has('address').result) {
        options.address = 'localhost';
    } else if (!validate(config.address).isString({notempty: true}).result) {
        cb(new Error("INVALID_ADDRESS"));
    } else {
        options.address = config.address;
    }

    // validate config.port
    if (!validate(config).has('port').result) {
        options.port = 80;
    } else if (!validate(config.port).isNumber({integer: true, unsigned: true, between:[1, 65535]}).result) {
        cb(new Error("INVALID_PORT"));
    } else {
        options.port = config.port;
    }

    // create server instance
    server = new Hapi.Server();
    server.connection(options);

    // register vision
    server.register(vision, (err) => {
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
            staticRoutes(server);
            apiRoutes(server);

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
