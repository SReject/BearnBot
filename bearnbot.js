var validate    = require('./common/validate.js'),
    PluginMgr   = require('./common/plugin-manager.js'),
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
        if (!validate(config).has('api').isObject().result) {
            throw new Error('CONFIG_API_MISSING');
        }
        var result = {};

        // validate config.api.redirect_url
        if (!validate(config.api).has('redirect_url').isString({notempty: true}).result) {
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

        var loadBot = (cb) => {
            if (validate(config).has('bot').isTruthy().result && (!validate(config.bot).has('enable').result || validate(config.bot).has('enable').isTruthy().result)) {
                return chatBot(config, (err, res) => {
                    if (err) {
                        cb(err);
                    } else {
                        result.chatbot = res;
                        cb();
                    }
                });
            } else {
                cb();
            }
        };
        var loadSite = (cb) => {
            if (validate(config).has('site').isTruthy().result && (!validate(config.site).has('enable').result || validate(config.site).has('enable').isTruthy().result)) {
                site(config, (err, res) => {
                    if (err) {
                        cb(err);
                    } else {
                        result.site = res;
                        cb();
                    }
                });
            } else {
                cb();
            }
        };

        loadBot((err) => {
            if (err) {
                return callback(err);
            }
            loadSite((err) => {
                if (err) {
                    callback(err);
                } else if (result.chatbot || result.site) {
                    PluginMgr.init(config, result, callback);
                } else {
                    callback();
                }
            });
        });

    } catch (e) {
        callback(e);
    }
};
