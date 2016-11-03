var logger = require('winston');
logger.level = 'debug';

module.exports = {
    init: () => {},
    error: (err) => {
        logger.error(err);
    },
    info: (info) => {
        logger.info(info);
    },
    verbose: (info) => {
        logger.verbose(info);
    },
    debug: (info) => {
        logger.debug(info);
    }
};
