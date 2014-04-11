/**
 * @file Manages configuration files
 */

var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    log = require('./logger').create('config'),
    userHome = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

/**
 * Config
 */
function Config() {}

/**
 * Parse configuration file located under given path
 * @param  {String}  configPath Path to the configuration file
 * @param  {Boolean} [strict]   Run in strict mode - causing process to exit on errors
 * @return {Config}
 */
Config.prototype.parse = function (configPath, strict) {
    var config;

    if (!fs.existsSync(configPath)) {
        if (!strict) return this;

        log.error('Configuration file not found: %s', configPath);
        process.exit(1);
    }

    try {
        config = require(configPath);
    } catch (e) {
        if (!strict) return this;

        log.error('Invalid configuration file: %s', configPath);
        process.exit(1);
    }

    if (_.isString(config.assertion)) this.assertion = config.assertion;
    if (_.isPlainObject(config.applications)) this.applications = config.applications;
    if (_.isArray(config.plugins)) this.plugins = config.plugins;
    if (_.isArray(config.browsers)) this.browsers = config.browsers;
    if (_.isPlainObject(config.tests)) {
        this.tests = config.tests;
    } else if (strict) {
        log.error('Invalid or missing test groups');
        process.exit(1);
    }

    return this;
};

/**
 * Load and parse configuration file located under given path,
 * also merge the configuration from the global configuration
 * @param  {String} configPath Path to the configuration file
 * @return {Config}
 */
function load(configPath) {
    var projectConfig = new Config().parse(configPath, true),
        globalConfig = new Config().parse(path.resolve(userHome, '.bender/bender.js')),
        parentConfig = new Config().parse(path.resolve(process.cwd(), '.bender/bender.js'));

    return _.merge({}, globalConfig, parentConfig, projectConfig, function (dest, src) {
        // override arrays instead of merging
        return _.isArray(dest) ? src : undefined;
    });
}

module.exports = {

    name: 'conf',

    attach: function (options) {
        this.conf = load(options.path);
    }
};
