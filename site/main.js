var Hapi = require('hapi'),
    path = require('path'),
    inert = require('inert'),
    validate = require('../common/validate/validate.js');

module.exports = {
    init: function (config) {
        var options = {};
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

        var server = new Hapi.server({
            connections: {
                routes: {
                    files: {
                        relativeTo: path.join(__dirname, 'www/static')
                    }
                }
            }
        });
        server.register(inert, () => {});
        server.connection(options);
        server.start(() => {});
    }
}
