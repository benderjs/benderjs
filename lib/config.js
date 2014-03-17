var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    log = require('./logger').create('configParser');


function Config() {
    this.applications = null;
    this.basePath = '';
    this.plugins = null;
    this.tests = null;
}

Config.prototype.parse = function(configPath) {
    var module;

    // TODO add support for global configuration files
    configPath = path.resolve(process.cwd(), configPath || 'bender.js');

    if (!fs.existsSync(configPath)) {
        log.error('Configuration file not found. You can create one using "bender init" command.');
        process.exit(1);
    }

    try {
        module = require(configPath);
    } catch (e) {
        log.error('Invalid configuration file.');
        process.exit(1);
    }

    // TODO is the application option required?
    if (_.isPlainObject(module.applications)) {
        this.applications = module.applications;
    }

    if (_.isString(module.basePath)) {
        this.basePath = path.resolve(process.cwd(), module.basePath);
    } else {
        log.error('Invalid configuration file - missing "basePath" option.');
        process.exit(1);
    }

    if (_.isArray(module.plugins)) {
        // TODO handle plugins here
        this.plugins = module.plugins;
    }

    if (_.isPlainObject(module.tests)) {
        this.tests = module.tests;
    } else {
        log.error('Invalid configuration file - missing test groups.');
        process.exit(1);
    }
};

module.exports = new Config();
