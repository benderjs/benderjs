var path = require('path'),
    config = require('./config'),
    log = require('./logger').create('plugins');

function PluginManager() {
    this.plugins = {};
}

PluginManager.prototype.load = function () {
    var dir = path.normalize(__dirname + '/../..');

    if (Array.isArray(config.plugins)) {
        config.plugins.forEach(function (name) {
            var plugin;

            try {
                plugin = require(path.resolve(dir + '/' + name));
            } catch (e) {
                log.error('Couldn\'t include plugin: ' + name);
                log.error(e);
                process.exit(1);
            }

            this.add(plugin);
        }.bind(this));
    }
};

PluginManager.prototype.add = function (plugin) {
    this.plugins[plugin.name] = {
        type: plugin.type,
        files: plugin.files
    };

    console.log(this.plugins);
};

module.exports = new PluginManager();
