var logger = require('./logger');

module.exports = {
    name: 'utils',

    attach: function () {
        var bender = this,
            utils = bender.utils = {},
            tplPattern = /(?:%)(\w+)(?:%)/g;

        /**
         * Dependency check helper function
         * @param {String}    name  Name of the module
         * @param {...String} names Dependency names
         */
        bender.checkDeps = function (name) {
            var modules = Array.prototype.slice.call(arguments, 1);

            Array.prototype.forEach.call(modules, function (mod) {
                if (!bender[mod]) {
                    logger.error('Missing module:', mod);
                    logger.error('Module', name, 'requires:', modules.join(', '));
                    process.exit(1);
                }
            });
        };

        /**
         * Render HTML content as the given response
         * @param {Object} res  HTTP response
         * @param {String} html HTML to render
         */
        utils.renderHTML = function (res, html) {
            res.writeHead(200, { Content: 'text/html' });
            res.end(html);
        };

        /**
         * Replace %NAME% tags with properties of the given data object
         * @param  {String} tpl  Template string
         * @param  {Object} data Data object
         * @return {String}
         */
        utils.template = function (tpl, data) {
            return tpl.replace(tplPattern, function (match, param) {
                return typeof data == 'object' && data[param];
            });
        };
    }
};
