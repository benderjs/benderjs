/**
 * @file Manages plugins - prepares DI objects for them
 */

var path = require('path'),
    log = require('./logger').create('plugins');

/**
 * Load plugins
 * @param  {Array.<String>} names Names of plugins to include
 * @return {Array.<Object>}
 */
function load(names) {
    var dir = path.normalize(__dirname + '/../..'),
        plugins = [];

    if (!Array.isArray(names)) return;

    names.forEach(function (name) {
        var plugin = {},
            module;

        try {
            module = require(path.resolve(dir + '/' + name));
        } catch (e) {
            log.error('Couldn\'t include plugin: ' + name);
            log.error(e);
            process.exit(1);
        }

        function handler(parent) {
            parent.add(name, module);
        }
        handler.$inject = [module.type + 's'];

        plugin[name] = ['factory', handler];

        log.info('Adding plugin: %s', name);
        plugins.push(plugin);
    });

    return plugins;
}

module.exports.load = load;
