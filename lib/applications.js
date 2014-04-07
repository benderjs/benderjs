/**
 * @file Manages application resources required by tests
 */
var _ = require('lodash'),
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
    this.url = options.url || this.name + '/';
    this.js = [];
    this.css = [];

    this.buildUrls(options.files);
}

/**
 * Build urls to application files that should be included in the test context
 * @param  {Array.<String>} files Names of fiels to be included
 */
Application.prototype.buildUrls = function (files) {
    var pattern = /\.(css|js)$/;

    files.forEach(function (file) {
        var ext = pattern.exec(file);

        if (ext) this[ext[1]].push('/apps/' + this.url + file);
    }, this);
};



/**
 * Application collection
 * @param {Object} config Configuration object
 */
function ApplicationCollection() {
    this.applications = {};
}

/**
 * Build application collection based on configuration file
 */
ApplicationCollection.prototype.build = function (conf) {
    var app, name;

    if (!_.isPlainObject(conf.applications)) return;

    for (name in conf.applications) {
        app = conf.applications[name];
        if (app && this.validate(app)) {
            this.applications[name] = new Application(name, app);
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
ApplicationCollection.prototype.validate = function (app) {
    return app && app.files && (app.proxy || app.path);
};

/**
 * Get application(s) based on given options
 * @param  {String|Array|Object} options Application name(s) or object property value to find an app
 * @return {Array.<Application>}
 */
ApplicationCollection.prototype.get = function (options) {
    var result = [];

    // get application by name
    if (_.isString(options)) {
        result = this.applications[options];
        return result ? [result] : [];
    }
    
    // get multiple applications
    if (_.isArray(options)) {
        _.forOwn(this.applications, function (app, name) {
            if (options.indexOf(name) > -1) result.push(app);
        });

        return result;
    }
    
    // get application by options, e.g. {url: 'myApp/'}
    if (_.isPlainObject(options)) return _.where(this.applications, options) || result;
    
    // return all apps if no options specified
    return this.applications;
};

module.exports = {

    name: 'applications',

    attach: function () {
        var bender = this;

        bender.checkDeps(module.exports.name, 'conf');

        bender.applications = new ApplicationCollection();
    },

    init: function (done) {
        var bender = this;

        bender.applications.build(bender.conf);
        done();
    }
};
