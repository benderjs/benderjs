/**
 * @file Manages configuration files
 */

var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    tv4 = require('tv4'),
    schema = require('./config-schema'),
    constants = require('./constants'),
    log = require('./logger').create('config'),
    userHome = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

/**
 * Configuration constructor
 * @param {String} configPath Path to the configuration file
 * @constructor
 */
function Config(configPath) {
    this.path = configPath;
}

/**
 * Parse configuration file located under given path
 * @param  {Boolean} [strict] Run in strict mode - causing process to exit on errors
 * @return {Config}
 */
Config.prototype.parse = function (strict) {
    var config;

    if (!fs.existsSync(this.path)) {
        if (!strict) return this;

        log.error('Configuration file not found: %s', this.path);
        process.exit(1);
    }

    try {
        config = require(this.path);
    } catch (e) {
        if (!strict) return this;

        log.error('Invalid configuration file: %s', this.path);
        process.exit(1);
    }

    _.merge(this, config);

    return this;
};

/**
 * Load and parse configuration file located under given path,
 * also merge the configuration from the global configuration
 * @param  {String} configPath Path to the configuration file
 * @return {Config}
 */
function load(configPath) {
    var projectConfig = new Config(configPath).parse(true),
        globalConfig = new Config(path.resolve(userHome, '.bender/' + constants.CONFIG_NAME)).parse(),
        // globalConfig = new Config(path.resolve(userHome, '.bender/bender.js')).parse(),
        parentConfig = new Config(path.resolve(process.cwd(), '.bender/' + constants.CONFIG_NAME)).parse();
        // parentConfig = new Config(path.resolve(process.cwd(), '.bender/bender.js')).parse();

    return _.merge({}, globalConfig, parentConfig, projectConfig, function (dest, src) {
        // override arrays instead of merging
        return Array.isArray(dest) ? src : undefined;
    });
}

/**
 * Recursively populates the instance with the default values taken from the
 * properties. This function does not return anything since it modifies
 * the instance argument.
 */
function applyDefaultValues(instance, properties) {
    if (typeof instance === 'object' && typeof properties === 'object') {
        Object.keys(properties).forEach(function (name) {
            var schema = properties[name],
                value;

            if (instance[name] === undefined &&
                (value = schema['default']) !== undefined)
                instance[name] = value;

            applyDefaultValues(instance[name], schema.properties);
        });
    }
}


module.exports = {

    name: 'conf',

    attach: function (options) {
        this.conf = load(options.path);

        applyDefaultValues(this.conf, schema.properties);

        if (!tv4.validate(this.conf, schema)) {
            log.error(tv4.error.message, 'at', tv4.error.dataPath);
            process.exit(1);
        }
    }
};
