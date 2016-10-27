var path       = require('path'),
    Hapi       = require('hapi'),
    vision     = require('vision'),
    handlebars = require('handlebars'),
    apiwrapper = require('./api/wrapper.js'),
    validate   = require('../common/validate/validate.js');

module.exports = {
    init: function (config) {
        var options = {}, server;
        if (!validate(config).has('address').result) {
            options.address = 'localhost';
        } else if (!validate(config.address).isString({notempty: true}).result) {
            throw new Error("INVALID_ADDRESS");
        }

        if (!validate(config).has('port').result) {
            options.port = 80;

        } else if (!validate(config.port).isNumber({integer: true, unsigned: true, between:[1, 65535]}).result) {
            throw new Error("INVALID_PORT");
        }

        server = new Hapi.server();
        server.connection(options);
        server.register(vision, (err) => {
            if (err) {
                throw new err;
            }
            server.views({
                engines: {
                    html: handlebars,
                },
                path:         path.join(__dirname, 'www/templates'),
                layoutPath:   path.join(__dirname, 'www/templates/layouts'),
                layout:       path.join(__dirname, 'default'),
                partialsPath: path.join(__dirname, 'www/templates/partials')
            });
            server.route([
                {
                    method: ['GET', 'POST', 'PUT', 'DELETE'],
                    path: '/api/{args*}',
                    handler: apiwrapper
                }, {
                    method: 'GET',
                    path: '/{page*}',
                    handler: (request, reply) => {
                        try {
                            var data = {},
                                page = encodeURIComponent(request.params.user);

                            reply.views(page + '/index.html', data);
                        } catch (e) {
                            // file not found?
                        }
                    }
                }
            ]);
            server.start(() => {});
        });
    }
}
