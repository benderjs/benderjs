/**
 * @file Manages plugins - prepares DI objects for them
 */

var path = require('path'),
    logger = require('./logger'),
    log = logger.create('plugins');

module.exports = {

    name: 'plugins',

    attach: function () {
        var bender = this,
            plugins = bender.plugins = {};


        if (!bender.assertions) {
            logger.log('Plugins module requires: assertions');
            process.exit(1);
        }
        /**
         * Load plugins 
         * @param  {Array.<String>} names Names of plugins to include
         * @return {Array.<Object>}
         */
        plugins.load = function () {
            var dir = path.normalize(__dirname + '/../..'),
                plugins = [];

            if (!Array.isArray(bender.conf.plugins)) return;

            bender.conf.plugins.forEach(function (name) {
                var plugin = {},
                    module;

                try {
                    module = require(path.resolve(dir + '/' + name));
                } catch (e) {
                    log.error('Couldn\'t include plugin: ' + name);
                    log.error(e);
                    process.exit(1);
                }

                module.attach = function () {
                    var bender = this;

                    bender[module.type + 's'].add(module.name, module);
                };

                bender.use(module);

                log.info('Adding plugin: %s', name);
            });
        };
    }
};
