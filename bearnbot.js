var forker   = require('child_process'),
    validate = require('./common/validate/validate.js'),
    DbMgr    = require('./common/database/manager.js');

module.exports = function (config) {
    if (config === undefined) {
        config = require('./config/config.json');
    }

    if (!validate(config).has("api").isObject().result) {
        throw new Error('CONFIG_API_MISSING');
    }
    var apiconfig = config.api,
        loadBot,
        loadSite,
        db,
        result = {};

    if (!validate(apiconfig).has("redirect_uri").isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_REDIRECTURI');
    }
    if (!validate(apiconfig).has('clientid').isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_CLIENTID');
    }
    if (!validate(apiconfig).has('secret').isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_SECRET');
    }
    if (!validate(apiconfig).has('baseapiurl').isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_BASEAPIURL')
    }
    if (!validate(apiconfig).has('authorizeurl').isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_AUTHORIZEURL');
    }
    if (!validate(apiconfig).has('tokenurl').isString({notempty: true}).result) {
        throw new Error('CONFIG_API_INVALID_TOKENURL');
    }

    var loadBot, loadSite;
    if (validate(config).has('bot').isTruthy().result) {
        loadBot = true;
    }
    if (validate(config).has('site').isTruthy().result) {
        loadSite = true;
    }

    if (loadBot || loadSite) {
        db = DbMgr.boot(config.database);
        if (loadBot) {
            result.bot = forker.fork('./bot/main.js', [config, db]);
        }
        if (loadSite) {
            result.site = forker.fork('./site/main.js', [config, db]);
        }
        return result;
    }
};
