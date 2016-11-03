var Promise = require('bluebird'),
    fs      = require('fs'),
    path    = require('path'),
    logger  = require('../../common/logger.js');

module.exports = (server) => {
    var rpath  = path.resolve(__dirname, '../routes/'),
        routeList   = [],
        routeFuncts = [],
        route;

    logger.debug("[Router] Preparing router files");
    fs.readdirSync(rpath).forEach(function (file) {
        if (/\.js$/i.test(file)) {
            route = require(path.resolve(rpath, file));
            if (typeof route === 'function') {
                routeFuncts.push(route);
            } else if (Array.isArray(route)) {
                if (route.length) {
                    routeList = routeList.concat(route);
                }
            } else {
                routeList.push(route);
            }
            logger.debug("[Router] Prepared: /routes/" + file);
        }
    });


     return new Promise((resolve, reject) => {
         function next() {
             if (routeFuncts.length) {
                 var result = (routeFuncts.shift())();
                 if (result) {
                     if (Array.isArray(result)) {
                         routeList = routeList.concat(result);

                     } else if (result.then) {
                         result.then((res) => {
                             if (Array.isArray(res)) {
                                routeList = routeList.concat(res);
                             } else {
                                 routeList.push(res);
                             }
                             next();
                         }).catch((e) => {
                             reject(e);
                         });

                     } else {
                         routeList.push(result);
                     }
                 } else {
                     next();
                }
            } else if (routeList.length) {
                logger.info("[Router] Registering routes");
                server.route(routeList);
                logger.info("[Router] Routes registered");
                resolve();
            }
         }

         if (routeList.length || routeFuncts.length) {
             next();

         } else {
             logger.info("[Router] Not routes to register");
             resolve();
         }
     });
 };
