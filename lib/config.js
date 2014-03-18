var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    log = require('./logger').create('configParser'),
    userHome = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE,
    parentConfig,
    globalConfig;


function Config() {}

Config.prototype.parse = function (configPath) {
    var module;

    if (!fs.existsSync(configPath)) {
        return this;
    }

    try {
        module = require(configPath);
    } catch (e) {
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
        // TODO what about the 'tests' defined in the higher level config?! should we allow to define them there?
    }

    return this;
};

Config.prototype.load = function (file) {
    var merged;

    this.parse(file);

    if (!globalConfig) globalConfig = new Config().parse(path.resolve(userHome, '.bender/bender.js'));
    if (!parentConfig) parentConfig = new Config().parse(path.resolve(process.cwd(), '.bender/bender.js'));

    merged = _.merge({}, globalConfig, parentConfig, this, function (dest, src) {
        return _.isArray(dest) ? dest.concat(src) : undefined;
    });

    this.applications = merged.applications;
    this.assertion = merged.assertion;
    this.plugins = merged.plugins;
    this.tests = merged.tests;

    console.log('#config', this);

    return this;
};

module.exports = new Config();
