const validate = require('../validate/validate.js');

// list of supported database's and their handler module
let supported = {
    'mongodb': './wrapper-monogodb.js'
};

module.export = {

    // returns a wrapper instance for the specified database type
    boot: (config) => {
        // validate config
        if (!config) {
            throw new Error('INVALID_DATABASE_CONFIG');
        }

        // validate type
        if (!validate(config).has('_db_type').isString({notempty: true}).result) {
            throw new Error('INVALID_DATABASE_TYPE');
        }
        if (!validate(supported).has(config._db_type).result) {
            throw new Error('DATABASE_TYPE_NOT_SUPPORTED');
        }

        // require the db handler wrapper
        // and return a new instance of the wrapper
        let db = require(supported[type]);
        return new db(config);
    },

    // registers a new db handler
    register: (type, handler) => {
        if (!validate(type).isString({notempty: true}).result) {
            throw new Error('INVALID_TYPE');
        }
        if (!handler) {
            throw new Error('INVALID_HANDLER');
        }
        supported[type] = handler;
    }
}
