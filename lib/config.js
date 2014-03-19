var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    log = require('./logger').create('config'),
    userHome = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE,
    parentConfig,
    globalConfig;

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
    var module;

    if (!fs.existsSync(configPath)) {
        if (strict) {
            log.error('Configuration file not found: %s', configPath);
            process.exit(1);
        }
        return this;
    }

    try {
        module = require(configPath);
    } catch (e) {
        if (strict) {
            log.error('Invalid configuration file: %s', configPath);
            process.exit(1);
        }
        return this;
    }

    if (_.isString(module.assertion)) {
        this.assertion = module.assertion;
    }

    if (_.isPlainObject(module.applications)) {
        this.applications = module.applications;
    }

    if (_.isArray(module.plugins)) {
        this.plugins = module.plugins;
    }

    if (_.isPlainObject(module.tests)) {
        this.tests = module.tests;
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
Config.prototype.load = function (configPath) {
    var merged;

    this.parse(configPath, true);

    if (!globalConfig) globalConfig = new Config().parse(path.resolve(userHome, '.bender/bender.js'));
    if (!parentConfig) parentConfig = new Config().parse(path.resolve(process.cwd(), '.bender/bender.js'));

    merged = _.merge({}, globalConfig, parentConfig, this, function (dest, src) {
        return _.isArray(dest) ? dest.concat(src) : undefined;
    });

    this.applications = merged.applications;
    this.assertion = merged.assertion;
    this.plugins = merged.plugins;
    this.tests = merged.tests;

    return this;
};

module.exports = new Config();
