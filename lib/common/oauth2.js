var hoek           = require('hoek'),
    Promise        = require('bluebird'),
    requestPromise = require('request-promise'),
    validate       = require('./validate.js'),
    config;

function configCheck() {
    return !(!config || !Object.keys(config).length);
}

/** When required, the only item exported is a function that when called:
  *     stores the input configuration
  *     replaces the exports with utility functions based on that configuration
  *
  * @access public
  * @param {Object} options
  */
module.exports = function (options) {
    if (options) {
        config = options;
    }
};



/** Returns a url to the authorizer based on the current config
  * @access public
  * @param {Array} scopes - List of scopes to request
  * @param {String} state - an optional state code that will be included in the url
  * @returns {String}
  */
module.exports.authUrl = function authUrl(scopes, state) {
    if (!configCheck()) {
        throw new Error("CONFIG NOT SPECIFIED");
    }
    return [
        config.authorizeurl,
        "?response_type=code",
        "&client_id="    + config.clientid,
        "&redirect_uri=" + encodeURIComponent(config.redirecturi),
        "&scope="        + encodeURIComponent((scopes || []).join(" ")),
        "&state="        + encodeURIComponent(state || '')
    ].join("");
};



/** Exchanges the authorization code for an access token with the oauth provider
  *
  * @access public
  * @param {String} code - The authorization code to exchange
  * @returns {Promise.<>}
  */
module.exports.exchange = function exchange(code) {
    if (!configCheck()) {
        throw new Error("CONFIG NOT SPECIFIED");
    }
    // make a POST request to the provider's token-exhchange url
    return requestPromise({
        method: "POST",
        uri: 'https://beam.pro/api/v1/oauth/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        form: {
            grant_type   : 'authorization_code',
            code         : code,
            client_id    : config.clientid,
            client_secret: config.clientsecret,
            redirect_uri : config.redirecturi
        },
        simple: false,
        resolveWithFullResponse: true

    // if the request finished with a 20X status code
}).then((response) => {
        var body = JSON.parse(response.body);

        // Responded with 2XX status code
        if (/^2\d\d$/.test(String(response.statusCode))) {
            return {
                response    : response,
                exchanged   : true,
                bearer      : body.access_token,
                refresh     : body.refresh_token,
                expiration  : Date.now() + (body.expires_in * 1000),
                redirecturl : config.redirecturi,
                error       : false
            };

        // Responded with 4XX status code
        } else if (/^4\d\d$/.test(String(response.statusCode))) {
            return {
                response    : response,
                exchanged   : false,
                error       : body.error || true,
                description : body.error_description
            };
        // all other status codes
        } else {
            return {
                response  : response,
                exchanged : false,
                error     : 'request'
            };
        }
    });
};



/** Attempts to refresh a token if its expired
  * @access public
  * @param {Object} token - Token to be refreshed
  * @param {Object} options - options related to processing the refresh
  * @return {Promise.<OBJECT>}
  */
module.exports.refresh = function refresh(token, options) {
    if (!configCheck()) {
        throw new Error("CONFIG NOT SPECIFIED");
    }
    options = options || {};

    // validate the `token` input
    if (!validate(token).isObject({
        contains:     ['bearer', 'refresh', 'redirecturl', 'expiration'],
        containsOnly: ['bearer', 'refresh', 'redirecturl', 'expiration']
    }).result) {
        throw new Error("OAUTH_REFRESH_TOKEN_INVALID");
    }
    if (!validate(token.bearer).isString({notempty: true}).result) {
        throw new Error("OAUTH_REFRESH_BEARERTOKEN_INVALID");
    }
    if (!validate(token.refresh).isString({notempty: true}).result) {
        throw new Error("OAUTH_REFRESH_REFRESHTOKEN_INVALID");
    }
    if (!validate(token.redirecturl).isString({notempty: true}).result) {
        throw new Error("OAUTH_REFRESH_REDIRECTURL_INVALID");
    }
    if (validate(token.expiration).isString().result) {
        if (/^\d+$/.test(token.expiration)) {
            throw new Error("OAUTH_REFRESH_EXPIRATION_INVALID");
        }
    } else if (!validate(token.expiration).isNumber({integer: true, unsigned: true}).result) {
        throw new Error("OAUTH_REFRESH_EXPIRATION_INVALID");
    }

    // if the token hasn't expired and the force refresh option has NOT been
    // specified, return a resolved promise that outputs the token
    if (token.expiration > Date.now() && !options.forceRefresh) {
        return new Promise((resolve) => {
            var ntoken      = hoek.clone(token);
            ntoken.invalid  = false;
            ntoken.refreshed = false;
            resolve(ntoken);
        });

    }

    // If the token needs to be refreshed make a POST request to the token
    // refresh end point
    return requestPromise({
        method: 'POST',
        uri: config.tokenurl,
        form: {
            grant_type   : 'refresh_token',
            refresh_token: token.refresh,
            client_id    : config.clientid,
            client_secret: config.clientsecret,
            redirect_uri : token.redirecturl
        },
        simple: false,
        resolveWithFullResponse: true
    }).then((response) => {
        var body = JSON.parse(response.responseBody);

        // Request resulted in a 2XX status code
        if (String(response.statusCode).test(/^2\d\d$/)) {
            return {
                response    : response,
                refreshed   : true,
                type        : body.token_type,
                token       : body.access_token,
                refresh     : body.refresh_token,
                expiration  : Date.now() + (body.expires_in * 1000),
                redirecturl : token.redirecturl,
                error       : false,
            };

        // Request resulted in a 4XX status code
        } else if (String(response.statusCode).test(/^4\d\d$/)) {
            return {
                response    : response,
                refreshed   : false,
                error       : body.error || true,
                description : body.error_description
            };

        // All other status codes
        } else {
            return {
                response  : response,
                refreshed : false,
                error     : 'request'
            };
        }
    });
};
