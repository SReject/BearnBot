/** webserver/utils/session-manager.js
  *     This code part of the https://github.com/SReject/bearnbot project.
  *     All rights reserved; see site for licensing
  *
  * Manages sessions between requests
  */

var hoek      = require('hoek'),
    randBytes = require('crypto').randomBytes,
    logger    = require('../../common/logger.js'),
    validate  = require('../../common/validate.js'),
    database  = require('../../common/database-handler.js'),
    settings = {
        collection: 'sessions',
        lifespan: 48 * 60 * 60 * 1000,
        cookieName: 'uid',
        cookieOptions: {
            ttl         : 48 * 60 * 60 * 1000,
            isSameSite  : false,
            isSecure    : false,
            isHttpOnly  : false,
            encoding    : 'none',
            domain      : 'localhost',
            path        : '/'
        }
    },
    sessions;

/** Generates a unique session id
  *
  * @access private
  * @return {Promise.<>}
  */
function generateId () {
    logger.debug('[Sessions/generateId] Generating session id');

    // generate a new session id
    var sessionid = randBytes(64).toString('hex');

    // check if the session id exists in the sessions table
    logger.debug('[Sessions/generateId Check if generated id exists');
    return sessions.findOne({id: sessionid}).then((item) => {

        // check if the sessionid was NOT found
        if (!item) {
            logger.debug('[Sessions/generateId] Unique ID generated');
            return sessionid;

        // if the sessionid pre-exists, generate a new one
        } else {
            logger.debug('[Sessions/generateId] Generated ID is in use');
            return generateId();
        }
    });
}

/** Retrieves data associated with the specified session id
  *
  * @access private
  * @param {String} id - The session id
  * @return {Object}
  */
function retrieve(id) {
    logger.debug('[Sessions/Retrieve] Retrieving data associated with session id');
    return sessions.findOne({'id': id}).then((item) => {
        if (item) {
             if (item.expiration > Date.now()) {
                 return item;
             }
             return sessions.deleteOne({'id': id});
        }
    });
}

/** Attempts to store data related to the session in the database
  *
  * @access private
  * @param {Session} request - the request's session instance
  * @return {Promise.<>}
  */
function store(session) {
    logger.debug('[Sessions/Store] Storing data associated with the session in the database');
    return sessions.updateOne(
        {'id': session._id},
        {'$set':{
            data:       JSON.stringify(session._data),
            expiration: Date.now() + settings.lifespan
        }},
        {'upsert': true}
    ).then(() => {
        logger.debug('[Sessions/Store] Successfully store session associated data');
    });
}

/** Decorates the request's session instance with the accessor function set
  *
  * @access private
  * @param {Object} request - The request object passed from Hapi
  * @return {Object}
  */
function decorate(request) {
    return {
        get: (key) => {
            if (Object.prototype.hasOwnProperty.call(request.session._data, key)) {
                return request.session._data[key];
            }
        },
        set: (key, value) => {
            if (validate(key).isString({notempty: true}).result) {
                request.session._data[key] = value;
            } else {
                throw new Error("INVALID_KEY");
            }
        },
        unset: (key) => {
            if (Object.prototype.hasOwnProperty.call(request.session._data, key)) {
                delete request.session._data[key];
            }
        },
        clear: () => {
            request.session._delete = true;
            request.session._data = {};
        },
        _data: {}
    };
}

/** Processes the request prior to authorization.
  *     Takes a client supplied uid cookie and attempts to retrieve session data
  *     associated with it from the database
  *
  * @access private
  * @param {Object} request - The request object passed from Hapi
  * @param {Object} reply     The reply object passed from Hapi
  */
function onPreAuthHandler(request, reply) {
    // if the route indicates it should be skipped; continue to the next handler
    // discontinuing furtherer processing here
    if (
        hoek.reach(request, 'route.settings.plugins.session.skip') &&
        request.route.settings.plugins.session.skip
    ) {
        reply.continue();
        return;
    }

    // process the request's session cookie
    var sessionid = request.state[settings.cookieName] || '';

    logger.debug('[Sessions] Inspecting session id');

    // cookie is not specified or is invalidly formatted
    if (!sessionid || !/^[a-f\d]+$/.test(sessionid)) {
        logger.debug('[Sessions] Id is not specified or is invalid');

        // generate a new id and session instance for the client
        generateId().then((id) => {
            logger.info('[Sessions] Creating new session');
            request.session._id = id;
            reply.continue();

        // log errors
        }).catch((e) => {
            logger.error('[Sessions] Failed to generate new id:');
            logger.error(e);
            reply(e);
        });


    // cookie format is valid, check if it exists in the sessions collection
    } else {
        retrieve(sessionid).then((session) => {

            // if the session id exists in database, fill the request's session
            // store with the data retrieved
            if (session) {
                logger.debug('[Sessions] Loaded associated session data from database');
                request.session._id   = sessionid;
                request.session._data = JSON.parse(session.data) || {};
                reply.continue();

            // if the session doesn't exist in database generate a new session
            // id for the client
            } else {
                logger.debug('[Sessions] Session id doesn\'t exist in database; generating new session');
                generateId().then((id) => {
                    request.session._id = id;
                    reply.continue();

                }).catch((err) => {
                    logger.debug('[Sessions] Unable to generate new session id');
                    reply(err);
                });
            }
        }).catch((e) => {
            logger.error('[Sessions] Failed to retrieve session data:');
            logger.error(e);
            reply(e);
        });
    }
}

/** Processes the request prior to a response being sent
  *     Stores any session data related to the request in the database and
  *     indicates to the Hapi Server instance to set the session cookie for the
  *     client
  *
  * @access private
  * @param {Object} request - The request object passed from Hapi
  * @param {Object} reply     The reply object passed from Hapi
  */
function onPreResponseHandler(request, reply) {
    // if the route indicates it should be skipped; continue to the next handler
    // discontinuing furtherer processing here
    if (
        hoek.reach(request, 'route.settings.plugins.session.skip') &&
        request.route.settings.plugins.session.skip
    ) {
        reply.continue();
        return;
    }
    if (!/^[23]\d\d$/.test(String(request.response.statusCode))) {
        reply.continue();
        return;
    }

    store(request.session).then(() => {
        reply.state(settings.cookieName, request.session._id);
        reply.continue();
    }).catch((e) => {
        logger.error(e);
        reply(e);
    });
}

module.exports.register = (server, options, next) => {
    logger.info("[Sessions] Initializing");

    // Add the domain parameter from the config to the cookieOptions
    // settings.cookieOptions.domain = config.domain;

    // Retrieve the sessions database collection
    logger.debug("[Sessions] Retrieving collection");
    database.getCollection(settings.collection, {create: true}).then((collection) => {
        logger.debug("[Sessions] Collection retrieved; Applying request hooks");

        // Store the collection instance for calls to generateId(), retrieve()
        // abd store()
        sessions = collection;

        // Register the cookie with the Hapi Server instance
        server.state(settings.cookieName, settings.cookieOptions);

        // Register the session function-set with the Hapi Server instance
        server.decorate('request', 'session', decorate, {apply: true});

        // apply request hooks
        server.ext('onPreAuth', onPreAuthHandler);
        server.ext('onPreResponse', onPreResponseHandler);

        // Indicate the plugin has finished loading
        logger.info("[Sessions] Successfully registered");
        next();

    }).catch((e) => {
        logger.error("[Sessions] Unable to retrieve collection:");
        logger.error(e);
        next(e);
    });
};
module.exports.register.attributes = {
    name:    'session-manager',
    version: '1.0.0',
    author:  'SReject'
};
