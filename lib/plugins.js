/**
 * @file Manages plugins - prepares DI objects for them
 */

var path = require('path'),
    logger = require('./logger'),
    log = logger.create('plugins');

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
    }.bind(this));
};



/**
 * Bender plugin collection
 * @param {Object} files File collection
 */
function PluginCollection(files) {
    this.plugins = {
        assertion: {},
        reporter: {},
        builder: {}
    };
    this.files = files;
}

/**
 * Add a plugin
 * @param {Object} options Plugin configuration object
 */
PluginCollection.prototype.add = function (options) {
    this.plugins[options.type][options.name.toLowerCase()] = new Plugin(options);
    if (options.files) this.files.add(options.files);
};

/**
 * Get a plugin
 * @param  {String} type Plugin type
 * @param  {String} name Plugin name
 * @return {Object|Null}
 */
PluginCollection.prototype.get = function (type, name) {
    return this.plugins[type] && this.plugins[type][name.toLowerCase()] || null;
};

/**
 * Load plugins 
 * @param {Object} conf Bender configuration object
 * @return {Array.<Object>}
 */
PluginCollection.prototype.load = function (conf) {
    var dir = path.normalize(__dirname + '/../..');

    if (!Array.isArray(conf.plugins)) return;

    conf.plugins.forEach(function (name) {
        var plugin = {},
            module;

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
    }.bind(this));
};


module.exports = {

    name: 'plugins',

    attach: function () {
        var bender = this;

        if (!bender.files) {
            logger.log('Plugins module requires: files');
            process.exit(1);
        }

        bender.plugins = new PluginCollection(bender.files);
    },

    init: function (done) {
        var bender = this;

        bender.plugins.load(bender.conf);
        done();
    }
};
