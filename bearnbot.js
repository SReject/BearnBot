var validate    = require('./common/validate/validate.js'),
    PluginMgr   = require('./common/plugins/plugin-manager.js'),
    chatBot     = require('./bot/chatbot.js'),
    site        = require('./site/serverapp.js');

module.exports = function (config, callback) {
    if (callback === undefined) {
        callback = (err) => {
            if (err) {
                throw err;
            }
        }
    }

    try {

        // Ensure the config argument is an object
        if (!validate(config).isObject().result) {
            throw new Error('INVALID_CONFIG');
        }

        // ensure the config argument has an 'api' property
        if (!validate(config).has("api").isObject().result) {
            throw new Error('CONFIG_API_MISSING');
        }
        var result = {};

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


        // check if the config has a 'bot' property
        if (validate(config).has('bot').isTruthy().result) {
            result.bot = chatBot(config.bot);
        }

        // check if the config has a 'site' property
        if (validate(config).has('site').isTruthy().result) {
            result.site = site(config.site);
        }

        // initialize the plugin manager
        PluginMgr.init(result, (err) => {
            if (err) {
                callback(err);
            } else {
                callback(false, result);
            }
        });
    } catch (e) {
        callback(e);
    }
};
