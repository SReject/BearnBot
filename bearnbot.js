var validate    = require('./common/validate/validate.js'),
    PluginMgr   = require('./common/plugins/manager.js'),
    databaseMgr = require('./common/database/manager.js'),
    dbstructure = require('./common/database/structure.json');

module.exports = function (config, callback) {
    try {
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
        var db,
            result = {};

        // validate config.api.redirect_url
        if (!validate(config.api).has("redirect_url").isString({notempty: true}).result) {
            throw new Error('CONFIG_API_INVALID_REDIRECTURL');
        }

        // validate config.api.client_id
        if (!validate(config.api).has('client_id').isString({notempty: true}).result) {
            throw new Error('CONFIG_API_INVALID_CLIENTID');
        }

        // validate config.api.secret
        if (!validate(config.api).has('secret').isString({notempty: true}).result) {
            throw new Error('CONFIG_API_INVALID_SECRET');
        }

        // validate config.api.base_url
        if (!validate(config.api).has('base_url').isString({notempty: true}).result) {
            throw new Error('CONFIG_API_INVALID_BASEURL')
        }

        // validate config.api.authorize_url
        if (!validate(config.api).has('authorize_url').isString({notempty: true}).result) {
            throw new Error('CONFIG_API_INVALID_AUTHORIZEURL');
        }

        // validate config.api.token_url
        if (!validate(config.api).has('token_url').isString({notempty: true}).result) {
            throw new Error('CONFIG_API_INVALID_TOKENURL');
        }

        // validate config.database
        if (!validate(config).has('database').isTruthy().result) {
            throw new Error('CONFIG_MISSING_DATABASE');
        }

        // Check to ensure something needs started
        if (!validate(config).has('bot').isTruthy().result && !validate(config).has('site').isTruthy().result) {
            callback(false, null);
            return
        }

        // initialize database
        db = databaseMgr.boot(config.database);

        db.init(dbstructure, (err) => {
            if (err) {
                callback(err);
            } else {

                // Initialize the plugin manager
                PluginMgr.init((err) => {

                    if (err) {
                        callback(err);
                    } else {

                        // check if the config has a 'bot' property
                        if (validate(config).has('bot').isTruthy().result) {
                            result.bot = require('./bot/main.js');
                            result.bot.init(config);
                        }

                        // check if the config has a 'site' property
                        if (validate(config).has('site').isTruthy().result) {
                            result.site = require('./site/main.js');
                            result.site.init(config);
                        }
                        callback(false, result);
                    }
                });
            }
        });
    } catch (e) {
        callback(e);
    }
};
