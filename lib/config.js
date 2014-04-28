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
 * @param  {String}  configPath Path to the configuration file
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

    if (_.isString(config.assertion)) this.assertion = config.assertion.toLowerCase();
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
    var projectConfig = new Config(configPath).parse(true),
        globalConfig = new Config(path.resolve(userHome, '.bender/bender.js')).parse(),
        parentConfig = new Config(path.resolve(process.cwd(), '.bender/bender.js')).parse();

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
