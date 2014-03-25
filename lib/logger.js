/**
 * @file Creates Winston logger instances
 */

var winston = require('winston'),
    _ = require('lodash'),
    defaults = {
        console: {
            colorize: true
        }
    },
    common = winston.loggers.add('common', defaults);

/**
 * Create and return an instance of Winston logger
 * @param  {String}  name     Logger name
 * @param  {Object}  options  Logger configuration object
 * @param  {Boolean} useLabel Should logs be labeled with logger name
 * @return {Object}
 */
function create(name, options, useLabel) {
    winston.loggers.add(name, _.merge({
        console: {
            label: useLabel && name
        }
    }, defaults, options));

    return winston.loggers.get(name);
}

module.exports = winston.loggers.get('common');
module.exports.create = create;
