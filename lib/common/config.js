var validate = require('./validate.js'),
    config;

module.exports.init = (options) => {
    if (config) {
        throw new Error('CONFIG_ALREADY_SET');
    }

    // input options is NOT an object containing required settings
    if (!validate(options).isObject({
        contains:     ['domain', 'ssl', 'database', 'api', 'chatbot', 'webserver', 'logging'],
        containsonly: ['domain', 'ssl', 'database', 'api', 'chatbot', 'webserver', 'logging']
    }).result) {
        throw new Error('INVALID_CONFIG');
    }

    // check options.domain
    if (!validate(options.domain).isString({notempty: true}).result) {
        throw new Error('DOMAIN_INVALID');
    }

    // check options.ssl
    if (!validate(options.ssl).isBoolean().result) {
        throw new Error('SSL_INVALID');
    }


    //-----------------------------
    //    CHECK options.DATABASE
    //-----------------------------

    // check options.database
    if (!validate(options.database).isObject({
        contains:['address'],
        containsonly: ['address', 'port', 'database', 'username', 'password']
    }).result) {
        throw new Error('DATABASE_INVALID');
    }

    // check options.database.address
    if (!validate(options.database.address).isString({notempty: true}).result) {
        throw new Error('DATABASE_ADDRESS_INVALID');
    }

    // check options.database.port
    if (
        validate(options.database).has("port").result &&
        !validate(options.database.port).isNumber({integer: true, unsigned: true, between:[1,65535]}).result
    ) {
        throw new Error('DATABASE_PORT_INVALID');
    }
    options.database.port = options.database.port || 27017;

    if (!validate(options.database).has("database").isString({notempty: true}).result) {
        throw new Error('DATABASE_DATABASE_INVALID');
    }

    // check options.database.username
    if (
        !validate(options.database).has("username").result &&
        validate(options.database).has("username").isString({notempty: true}).result
    ) {
        throw new Error('DATABASE_USERNAME_INVALID');
    }

    // check options.database.password
    if (
        !validate(options.database).has("password").result &&
        validate(options.database).has("password").isString({notempty: true}).result
    ) {
        throw new Error('DATABASE_PASSWORD_INVALID');
    }

    // check if username or password is specified but the other isn't
    if ((
        validate(options.database).has("username").result &&
        !validate(options.database).has("password").result
    ) || (
        !validate(options.database).has("username").result &&
        validate(options.database).has("password").result
    )) {
        throw new Error('DATABASE_CREDENTIALS_INVALID');
    }



    //------------------------
    //    CHECK options.API
    //------------------------

    // check options.api
    if (!validate(options.api).isObject({contains:[
        'clientid',
        'clientsecret'
    ]}).result) {
        throw new Error('API_INVALID');
    }

    // check options.api.clientsecret
    if (!validate(options.api.clientsecret).isString({notempty: true}).result) {
        throw new Error('API_CLIENTSECRET_INVALID');
    }



    //------------------------------
    //    CHECK options.WEBSERVER
    //------------------------------

    // check options.webserver
    if (!validate(options.webserver).isObject({
        contains:['enable'],
        containsonly:['enable', 'address', 'port']
    }).result) {
        throw new Error('WEBSERVER_INVALID');
    }

    // check options.webserver.enable
    if (!validate(options.webserver).has("enable").isBoolean().result) {
        throw new Error('WEBSERVER_ENABLE_INVALID');
    }

    // check options.webserver.*
    if (options.webserver.enable) {

        // check options.webserver.address
        if (
            validate(options.webserver).has("address").result &&
            !validate(options.webserver).has("address").isString({notempty: true}).result
        ) {
            throw new Error('WEBSERVER_ADDRESS_INVALID');
        }

        // check options.webserver.port
        if (
            validate(options.webserver).has('port').result &&
            !validate(options.webserver).has('port').isNumber({integer: true, unsigned: true, between: [1,65535]}).result
        ) {
            throw new Error('WEBSERVER_PORT_INVALID');
        }

        options.webserver.address = options.webserver.address || '127.0.0.1';
        options.webserver.port = options.webserver.port || 80;
    }



    //----------------------------
    //    CHECK options.CHATBOT
    //----------------------------

    // check options.chatbot
    if (!validate(options.chatbot).isObject({
        contains: ['enable'],
        containsonly:['enable', 'username', 'password']
    }).result) {
        throw new Error('CHATBOT_INVALID');
    }

    // check options.chatbot.enable
    if (!validate(options.chatbot.enable).isBoolean().result) {
        throw new Error('CHATBOT_ENABLE_INVALID');
    }

    // check options.chatbot.*
    if (options.chatbot.enable) {

        // check options.chatbot.username
        if (!validate(options.chatbot).has('username').isString({match: /^[A-Z_][\w-]{3,19}$/}).result) {
            throw new Error('USERNAME_INVALID');
        }

        // check options.chatbot.username
        if (!validate(options.chatbot.password).isString({notempty: true}).result) {
            throw new Error('CHATBOT_PASSWORD_INVALID');
        }
    }



    //----------------------------
    //    CHECK options.LOGGING
    //----------------------------

    // check options.logging
    if (!validate(options.logging).isObject({
        contains: ['enable'],
        containsly: ['enable', 'directory', 'level']
    }).result) {
        throw new Error('LOGGING_INVALID');
    }

    // check options.logging.enable
    if (!validate(options.logging.enable).isBoolean().result) {
        throw new Error('LOGGING_ENABLE_INVALID');
    }

    // check options.logging.*
    if (options.logging.enable) {
        if (
            validate(options.logging).has('directory').result &&
            !validate(options.logging.directory).isString({notempty: true}).result
        ) {
            throw new Error("LOGGING_DIRECTORY_INVALID");
        }
        options.logging.directory = options.logging.directory || '/logs';

        if (
            validate(options.logging).has('level') &&
            !validate(options.logging.level).isString({match: /^(?:error|info|verbose|debug)$/i}).result
        ) {
            throw new Error("LOGGING_LEVEL_INVALID");
        }
        options.logging.level = 'info';
    }
    config = options;
};

module.exports.get = function() {
    return config;
};
