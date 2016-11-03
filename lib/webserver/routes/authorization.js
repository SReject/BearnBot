var randBytes = require('crypto').randomBytes,
    requester = require('request-promise'),
    database  = require('../../common/database-handler.js'),
    logger    = require('../../common/logger.js'),
    oauth2    = require('../../common/oauth2.js'),
    validate  = require('../../common/validate.js');


module.exports = () => {
    return database.getCollection("users/accounts", {create: true}).then((accounts) => {
        return [

        // login authorization path; should only be accessible via clicking the
        // button on /login and redirects to the beam authorization page after
        // setting session information
        {
            path: "/login/authorize",
            method: "GET",
            handler: (request, reply) => {
                logger.debug("[Authorize/Authorize] Authorize requested");

                // if the client is logged in redirect back to home
                if (request.session.get("userid")) {
                    logger.debug("[Authorize/Authorize] Already logged in; redirecting back to home");
                    reply.redirect('/');

                // otherwise, store a state variable and redirect to beam's authorization url
                } else {
                    var state, scopes;
                    if (request.session.get("authorizing")) {
                        state  = request.session.get("authorizing").state;
                        scopes = request.session.get("authorizing").scopes;

                    } else {
                        state  = randBytes(16).toString('hex');
                        scopes = ['user:details:self', 'channel:details:self', 'channel:update:self'];
                    }
                    request.session.set("authorizing", {state: state, scopes: scopes});

                    logger.debug("[Authorize/Authorize] Redirecting to authorizer");
                    reply().redirect(oauth2.authUrl(scopes, state));
                }
            }
        },
        {
            path: "/login/code",
            method: "GET",
            handler: (request, reply) => {
                logger.debug("[Authorize/Code] Code challenge requested");

                // if there's no state variable, redirect back to home
                if (!request.session.get("authorizing")) {
                    logger.debug("[Authorize/Code] User does not have an authorization state variable");
                    return reply.redirect('/');
                }

                // validate query parameters
                if (!validate(request.query).isObject({verbose: true, contains: ['state'], containsonly: ['error', 'state', 'code']}).result) {
                    logger.debug("[Authorize/Code] Parameters invalid");
                    return reply.redirect('/');
                }

                // ensure the query parameters contain a code or error parameter
                if (
                    !validate(request.query).has("code").isString({notempty:true}).result &&
                    !validate(request.query).has("error").isString({notempty:true}).result
                ) {
                    logger.debug("[Authorize/Code] No code or error parameter; or paramater are invalid");
                    return reply.redirect('/');
                }

                // valiadate state query parameter
                if (
                    !validate(request.query).has("state").isString({notempty: true}).result ||
                    request.session.get("authorizing").state !== request.query.state
                ) {
                    logger.debug("[Authorize/Code] state parameter not specified or invalid");
                    return reply.redirect('/');
                }

                // An error was indicated; clear authorizing state then redirect to /
                if (request.query.error) {
                    request.session.unset("authorizing");
                    logger.debug("[Authorize/Challenge] Error returned: " + request.query.error);
                    return reply.redirect('/');
                }

                // parameters look good; begin code->bearer exchange
                logger.debug("[Authorize/Code] Attempting to exchange code for bearer token");
                var update = {
                    dateregistered: Date.now(),
                    datelastactive: Date.now(),
                    roles: ['user'],
                    oauth: {
                        scopes: request.session.get("authorizing").scopes
                    }
                };

                oauth2.exchange(request.query.code).then((token) => {

                    if (token.error) {
                        logger.debug("[Authorize/Code] Bearer exchange failed: " + token.error);
                        return reply.redirect('/');
                    }

                    logger.debug("[Authorize/Code] Exchanged code for bearer token");
                    update.oauth = {
                        bearer:      token.bearer,
                        refresh:     token.refresh,
                        redirecturl: token.redirecturl,
                        expiration:  token.expiration,
                    };

                    requester({
                        method: "GET",
                        uri:    "https://beam.pro/api/v1/users/current",
                        headers:{
                            Authorization: "Bearer " + token.bearer
                        },
                        json: true
                    }).then((userdata) => {
                        update.userid   = userdata.id;
                        update.username = userdata.username;
                        update.chanid   = userdata.channel.chanid;
                        update.avatar   = userdata.avatarUrl;

                        // update session data
                        return accounts.updateOne({userid: update.userid}, {'$set': update}, {upsert: true}).then(() => {
                            request.session.unset("authorizing");
                            request.session.set("userid", update.userid);

                            logger.debug("[Authorize/Code] User authorized");
                            reply.redirect('/');
                        });

                    }).catch((e) => {
                        logger.error("[Authorize/Code] Failed to retrieve or store user data:");
                        logger.error(e);
                    });


                }).catch((e) => {
                    logger.error("[Authorize/Code] Failed to exchange code:");
                    logger.error(e);
                    reply(e);
                });
            }
        }];
    });
};
