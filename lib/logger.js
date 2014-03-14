var winston = require('winston'),
    _ = require('lodash'),
    defaults = {
        console: {
            colorize: true
        }
    };

module.exports.create = function (name, options, useLabel) {
    winston.loggers.add(name, _.merge({
        console: {
            label: useLabel && name
        }
    }, defaults, options));

    return winston.loggers.get(name);
};

module.exports.log = winston.log;
module.exports.info = winston.info;
module.exports.debug = winston.debug;
module.exports.warn = winston.warn;
