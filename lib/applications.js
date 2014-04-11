/**
 * @file Manages application resources required by tests
 */
var path = require('path'),
    util = require('util'),
    Collection = require('./collection'),
    logger = require('./logger');

/**
 * Application
 * @param {String}         name            Application name
 * @param {Object}         options         Application configuration
 * @param {String}         [options.proxy] Application's URL to proxy into
 * @param {String}         [options.path]  Application's local directory
 * @param {String}         options.url     Application's url
 * @param {Array.<String>} options.files   Application files
 * @constructor
 */
function Application(name, options) {
    if (options.proxy) this.proxy = options.proxy;
    if (options.path) this.path = options.path;
    
    this.name = name;
    this.url = path.normalize((options.url || this.name) + '/');

    this.buildFiles(options.files);
}

/**
 * Build urls to application files that should be included in the test context
 * @param  {Array.<String>} files Names of fiels to be included
 */
Application.prototype.buildFiles = function (files) {
    var pattern = /\.(css|js)$/;

    this.js = [];
    this.css = [];

    files.forEach(function (file) {
        var ext = pattern.exec(file);

        if (ext) this[ext[1]].push('/apps/' + this.url + file);
    }, this);
};



/**
 * Application collection
 * @extends {Collection}
 */
function Applications() {
    Collection.call(this);
}

util.inherits(Applications, Collection);

/**
 * Build application collection based on configuration file
 */
Applications.prototype.build = function (conf) {
    var app, name;

    if (!conf.applications || typeof conf.applications != 'object') return;

    for (name in conf.applications) {
        app = conf.applications[name];
        if (app && this.validate(app)) {
            this.add(name, new Application(name, app));
        } else {
            logger.error('Invalid application definition for "%s"', name);
            process.exit(1);
        }
    }
};

/**
 * Validate application's properties
 * @param  {Object} app Application configuration
 * @return {Boolean}
 */
Applications.prototype.validate = function (app) {
    return app && app.files && (app.proxy || app.path);
};

module.exports = {

    name: 'applications',

    attach: function () {
        var bender = this;

        bender.checkDeps(module.exports.name, 'conf');

        bender.applications = new Applications();
    },

    init: function (done) {
        var bender = this;

        bender.applications.build(bender.conf);
        done();
    }
};
