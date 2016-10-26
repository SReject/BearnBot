var forker      = require('child_process'),
    validate    = require('./common/validate/validate.js'),
    databaseMgr = require('./common/database/manager.js');

module.exports = function (config) {

    // if config is undefined, attempt to load the config from file
    if (config === undefined) {
        config = require('./config/config.json');
    }

    // Ensure the config argument is an object
    if (!validate(config).isObject().result) {
        throw new Error('INVALID_CONFIG');
    }

    // ensure the config argument has an 'api' property
    if (!validate(config).has("api").isObject().result) {
        throw new Error('CONFIG_API_MISSING');
    }
    var apiconfig = config.api,
        loadBot,
        loadSite,
        db,
        result = {};

    // validate config.api.redirect_url
    if (!validate(apiconfig).has("redirect_url").isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_REDIRECTURI');
    }

    // validate config.api.client_id
    if (!validate(apiconfig).has('client_id').isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_CLIENTID');
    }

    // validate config.api.secret
    if (!validate(apiconfig).has('secret').isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_SECRET');
    }

    // validate config.api.base_url
    if (!validate(apiconfig).has('base_url').isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_BASEAPIURL')
    }

    // validate config.api.authorize_url
    if (!validate(apiconfig).has('authorize_url').isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_AUTHORIZEURL');
    }

    // validate config.api.token_url
    if (!validate(apiconfig).has('token_url').isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_TOKENURL');
    }

    // Ensure the config arguemtn has a database property
    if (!validate(config).has('database').isObject().result) {
        throw new Error('CONFIG_DATABASE_INVALID');
    }

    // check if the config has a 'bot' property
    if (validate(config).has('bot').isTruthy().result) {
        loadBot = true;
    }

    // check if the config has a 'site' property
    if (validate(config).has('site').isTruthy().result) {
        loadSite = true;
    }

    // if the site or bot needs to be loaded
    if (loadBot || loadSite) {

        // boot the database maanager
        db = databaseMgr.boot(config.database);

        // then fork the process if the bot and/or site needs to be loaded
        if (loadBot) {
            result.bot = forker.fork('./bot/main.js', [config, db]);
        }
        if (loadSite) {
            result.site = forker.fork('./site/main.js', [config, db]);
        }

        // return the result object
        return result;
    }
};
