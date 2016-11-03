var hoek      = require('hoek'),
    requester = require('request-promise'),
    logger    = require('../../common/logger.js'),
    oauth2    = require('../../common/oauth2.js'),
    database  = require('../../common/database-handler.js'),
        baseCrdts = {
        userid         : 0,
        chanid         : 0,
        roles          : ['guest'],
        reauthneeded   : false,

        authorized     : false,
        username       : "Guest",
        avatar         : "/public/media/guest_avatar.png",
        dateregistered : 0,
        datelastactive : 0,

        botenabled     : true
    },
    accounts,
    scheme = {};


module.exports.register = (server, options, next) => {
    database.getCollection('users/accounts', {create: true}).then((collection) => {
        accounts = collection;
        server.auth.scheme('accountmanager', () => scheme);
        next();

    }).catch((e) => {
        logger.error('[Accounts] Registration Error:');
        logger.error(e);
        next(e);
    });
};

module.exports.register.attributes = {
    "name": "account-manager",
    "version": "1.0.0",
    "author": "SReject"
};



scheme.authenticate = (request, reply) => {
    var userid   = request.session.get('userid'),
        crdts    = hoek.clone(baseCrdts);


    // if authentication is to be skipped or the user isn't logged in return
    // default credentials
    if (

        hoek.reach(request, 'route.settings.plugins.session.skip') ||
        hoek.reach(request, 'route.settings.plugins.accountmanager.skip')
    ) {
        logger.debug("[Accounts] Skipping authorization");
        reply.continue({credentials: crdts});
        return;
    }

    if (!/^\d+$/.test(userid)) {
        logger.debug("[Accounts] User not logged in; returning guest credientials");
        reply.continue({credentials: crdts});
        return;
    }

    // retrieve basic information pretaining to the account
    logger.debug("[Accounts] Retrieving user data from database");
    accounts.findOne({userid: userid}).then((user) => {

        // if the user doesn't exist in the database, clear the user id and
        // return default credentials
        if (!user) {
            logger.debug("[Accounts] User not found");
            request.session.unset('userid');
            reply.continue({credentials: crdts});
            return;
        }

        logger.debug("[Accounts] Compiling account details");

        var oauth = user.oauth || {},
            update = {
                datelastactive: Date.now()
            };

        // Build basic credentials list from data retrieved from the database
        crdts.userid         = user.userid;
        crdts.chanid         = user.chanid;
        crdts.roles          = user.roles || ['user'];
        crdts.authorized     = true;
        crdts.botenabled     = user.botenabled || false;
        crdts.username       = user.username || 'unknown';
        crdts.avatar         = user.avatar || '/public/media/guest_avatar.png';
        crdts.dateregistered = user.dateregistered || Date.now();
        crdts.datelastactive = update.datelastactive;

        // if the user's oauth data is inheritly invalid, clear the data from
        // the database and continue with the currently stored user credentials
        if (!oauth.bearer || !oauth.refresh || !oauth.expiration || !oauth.redirecturl) {
            logger.debug("[Accounts] Users oauth is invalid; clearing");
            crdts.reauthneeded = true;
            update.oauth = {};
            accounts.updateOne({userid: crdts.userid}, {'$set': update}).then(() => {
                reply.continue({credentials: crdts});

            }).catch(() => {
                reply.continue({credentials: crdts});
            });
            return;
        }

        // Call the oauth2 refresh function which will refresh the token if its
        // needed and return the new token.
        logger.debug("[Accounts] Refreshing user's oauth token");
        oauth2.refresh(oauth).then((token) => {

            // if the token was refreshed store the updated token data
            // in the update object to be wrote to the database after
            // processing the user
            if (token.refreshed) {
                logger.debug("[Accounts] Token refreshed");
                update.oauth = {
                    bearer:      token.bearer,
                    refresh:     token.refresh,
                    expiration:  token.expiration,
                    redirecturl: token.redirecturl,
                    scopes     : user.oauth.scopes
                };
                user.oauth = update.oauth;

            // if the refreshing failed due to the token details being invalid
            // set the oauth data in the database to be clear for the user
            } else if (token.error && token.error !== 'request') {
                logger.debug("[Accounts] Unable to refresh token: " + token.error);
                update.oauth = {};
                crdts.reauthneeded = true;
            }

            return token;

        // if the token was refreshed or data related to the user is missing
        // attempt to retrieve user data from beam
        }).then((token) => {
            if (token.refreshed ||  !user.chanid || !user.username) {
                logger.debug("[Accounts] Retrieving user data from beam");
                return requester({
                    method: "GET",
                    uri:    "https://beam.pro/api/v1/users/current",
                    headers:{
                        Authorization: "Bearer " + user.oauth.bearer
                    },
                    json: true
                }).then((userdata) => {
                    logger.debug("[Accounts] Beam user data retrieved");
                    update.username = user.username = userdata.username;
                    update.avatar   = user.avatar   = userdata.avatarURL;
                    update.chanid   = user.chanid   = userdata.channel.id;

                }).catch((e) => {
                    logger.error("[Accounts] Unable to retrieve beam user data:");
                    logger.error(e);
                });
            }
        }).then(() => {
            logger.debug("[Accounts] Updating database's user details");
            return accounts.updateOne(
                {userid: userid},
                {'$set': update}
            ).then(() => {
                logger.debug("[Accounts] database's user details updated");
                reply.continue({credentials: crdts});

            }).catch((e) => {
                logger.error("[Accounts] Unable to update database's user details:");
                logger.error(e);
                reply(e);
            });
        });
    }).catch((e) => {
        logger.error("[Accounts] Unable to retrieve user details from database:");
        logger.error(e);
        reply(e);
    });
};
