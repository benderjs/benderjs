var fs = require('fs'),
    path = require('path'),
    logger = require('./logger');

module.exports = {
    name: 'utils',

    attach: function () {
        var bender = this,
            utils = bender.utils = {},
            tplPattern = /(?:%)(\w+)(?:%)/g;

        /**
         * Dependency check helper function
         * @param {String}    name    Name of the module
         * @param {...String} modules Dependency names
         */
        bender.checkDeps = function (name, modules) {
            modules = Array.prototype.slice.call(arguments, 1);

            Array.prototype.forEach.call(modules, function (mod) {
                if (bender[mod]) return;

                logger.error('Missing module:', mod);
                logger.error('Module', name, 'requires:', modules.join(', '));
                process.exit(1);
            });
        };

        /**
         * Render HTML content as a response
         * @param {Object} res  HTTP response
         * @param {String} html HTML to render
         */
        utils.renderHTML = function (res, html) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        };

        /**
         * Render JSON object as a response
         * @param {Object} res HTTP response
         * @param {Object} obj Object to render
         */
        utils.renderJSON = function (res, obj) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(obj));
        };

        /**
         * Render given script as a response
         * @param  {Object} res    HTTP response
         * @param  {String} script Script's content
         */
        utils.renderScript = function (res, script) {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(script);
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

        /**
         * Creates a direcory, makes parent directories if needed
         * @param {String}   dirPath    Path to create
         * @param {Function} callback   Function called when done or error occures
         * @param {Number}   [position] Used internally
         */
        utils.mkdirp = function (dirPath, callback, position) {
            var next = function () {
                    utils.mkdirp(dirPath, callback, position + 1);
                },
                directory;

            position = position || 0;
            parts = path.normalize(dirPath).split('/');

            if (position >= parts.length) return typeof callback == 'function' && callback();
         
            directory = parts.slice(0, position + 1).join('/');

            if (!directory) return next();

            fs.stat(directory, function (err) {
                if (err) {
                    fs.mkdir(directory, 0777, function (err) {
                        if (err && err.code !== 'EEXIST') {
                            if (typeof callback == 'function') return callback(err);
                            else throw err;
                        } else {
                            next();
                        }
                    });
                } else {
                    next();
                }
            });
        };
    }
};
