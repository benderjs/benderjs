/**
 * @file Manages plugins - prepares DI objects for them
 */

var path = require('path'),
    _ = require('lodash'),
    log = require('./logger').create('plugins');

/**
 * Bender plugin
 * @param {Object} options Configuration options
 */
function Plugin(options) {
    this.name = options.name;
    this.type = options.type;

    if (options.files) this.parseFiles(options.files);
}

/**
 * Parse file paths and assign them to appropriate arrays
 * @param  {Array.<String>} files Array of files
 */
Plugin.prototype.parseFiles = function (files) {
    var pattern = /\.(css|js)$/;

    this.js = [];
    this.css = [];

    files.forEach(function (file) {
        var ext = pattern.exec(file);

        if (ext) this[ext[1]].push('/plugins' + file);
    }, this);
};



/**
 * Bender plugin collection
 * @param {Object} files File collection
 */
function Plugins() {
    this.plugins = {
        assertion: {},
        reporter: {},
        builder: {}
    };
    this.files = [];
}

/**
 * Add a plugin
 * @param {Object} options Plugin configuration object
 */
Plugins.prototype.add = function (options) {
    this.plugins[options.type][options.name.toLowerCase()] = new Plugin(options);
    if (options.files) this.files = this.files.concat(options.files);
};

/**
 * Check if given path is defined in plugins.
 * This function is used to validate whether a file should be served or not
 * @param  {String} file File path
 * @return {Boolean}
 */
Plugins.prototype.checkFile = function (file) {
    return this.files.indexOf(file) > -1;
};

/**
 * Get a plugin
 * @param  {String} type Plugin type
 * @param  {String} name Plugin name
 * @return {Object|Null}
 */
Plugins.prototype.get = function (type, name) {
    return this.plugins[type] && this.plugins[type][name.toLowerCase()] || null;
};

/**
 * Load plugins 
 * @param {Object} bender Bender object
 */
Plugins.prototype.load = function (bender) {
    var dir = path.normalize(__dirname + '/../..');

    if (!Array.isArray(bender.conf.plugins)) return;

    bender.conf.plugins.forEach(function (name) {
        var module;

        try {
            module = require(path.resolve(dir + '/' + name));
        } catch (e) {
            log.error('Couldn\'t include plugin: ' + name);
            log.error(e);
            process.exit(1);
        }

        if (!module.name || !module.type) {
            log.error('Invalid plugin definition for: %s', name);
            process.exit(1);
        }

        // attach server side modules
        if (module.attach) {
            bender.use(module);
        } else {
            this.add(module);
        }

        log.info('Adding plugin: %s', name);
    }, this);
};


module.exports = {

    name: 'plugins',

    attach: function () {
        // used to fix conflict with internal app property called 'plugins'
        this.plugins = _.merge(new Plugins(), this.plugins);
    },

    init: function (done) {
        var bender = this;

        bender.plugins.load(bender);
        done();
    }
};
