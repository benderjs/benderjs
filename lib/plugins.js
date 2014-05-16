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
function Plugin(name, options) {
    _.merge(this, options, { name: name });

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

        if (ext) this[ext[1]].push(path.join('/plugins/', file).split(path.sep).join('/'));
    }, this);
};

module.exports = {

    name: 'plugin-manager',

    attach: function () {
        var bender = this,
            plugins;

        plugins = {
            /**
             * Plugin file list, used internally
             * @priate
             * @type {Array}
             */
            _fileList: [],

            /**
             * Add a plugin
             * @param {Object} options Plugin configuration object
             */
            add: function (options) {
                var match = options.name.match(/bender\-(\w+)\-(\w+)/),
                    plugin,
                    group,
                    type,
                    name;

                if (!match || !(name = match[2]) || !(type = match[1]) ||
                    !(group = bender[type + 's'])) {
                    log.error('Invalid definition for plugin: ' + options.name);
                    process.exit(1);
                }

                plugin = new Plugin(name, options);

                if (Array.isArray(group)) {
                    group.push(plugin);
                } else {
                    group[name] = plugin;
                }

                if (options.files) plugins.addFiles(plugin.files);
            },

            /**
             * Add files to the list of valid, shared files
             * @param {Array.<String>} files File paths
             */
            addFiles: function (files) {
                plugins._fileList = plugins._fileList.concat(files);
            },

            /**
             * Check if given path is defined in plugins.
             * This function is used to validate whether a file should be served or not
             * @param  {String} file File path
             * @return {Boolean}
             */
            checkFile: function (file) {
                return plugins._fileList.indexOf(path.normalize(file)) > -1;
            },

            /**
             * Load plugins 
             * @param {Object} bender Bender object
             */
            load: function (bender) {
                var dir = path.normalize(__dirname + '/../..');

                if (!Array.isArray(bender.conf.plugins)) return;

                bender.conf.plugins.forEach(function (name) {
                    var plugin;

                    try {
                        plugin = require(path.resolve(dir + '/' + name));
                    } catch (e) {
                        log.error('Couldn\'t include plugin: ' + name);
                        log.error(e);
                        process.exit(1);
                    }

                    // attach server side plugins
                    if (plugin.attach) {
                        bender.use(plugin);
                    } else {
                        this.add(plugin);
                    }

                    log.info('Loaded plugin: %s', name);
                }, this);
            }
        };

        // used to fix conflict with internal app property called 'plugins'
        bender.plugins = _.merge(plugins, bender.plugins);
        
        bender.assertions = bender.assertions || {};
        bender.pagebuilders = bender.pagebuilders || [];
        bender.testbuilders = bender.testbuilders || [];
        bender.reporters = bender.reporters || {};

        bender.plugins.load(bender);
    }
};
