var fs = require('fs'),
    path = require('path'),
    when = require('when'),
    readFile = require('when/node').lift(fs.readFile),
    combine = require('dom-combiner');

module.exports = {
    attach: function () {
        var bender = this,
            template = bender.template = {};

        template.defaultTpl = null;

        /**
         * Build a HTML template from given test data
         * @param  {Object} data         Test data
         * @param  {String} data.js      Test script path
         * @param  {Array}  data.head    Scripts and styles to be added to the header
         * @param  {String} [data.html]  Test HTML path
         * @return {String} Context HTML
         */
        template.build = function (data) {
            var parts = [],
                head = ['<head>'];

            /**
             * Append to head link/script tags created from src object
             * @param {Object}         src       Source object
             * @param {Array.<String>} [src.css] Paths to stylesheets
             * @param {Array.<String>} [src.js]  Paths to scripts
             */
            function addToHead(src) {
                src.css.forEach(function (css) {
                    head.push('<link rel="stylesheet" href="' + css + '">');
                });
                src.js.forEach(function (js) {
                    head.push('<script src="' + js + '"></script>');
                });
            }

            if (template.default) {
                parts.push(template.default);
            } else {
                parts.push(
                    readFile(path.join(__dirname, '../static/default.html'))
                        .then(function (data) {
                            template.defaultTpl = data.toString();
                            return template.defaultTpl;
                        })
                    );
            }

            data.head.forEach(addToHead);
            head.push('</head>');
            parts.push(head.join(''));

            if (data.html) {
                parts.push(
                    readFile(data.html).then(function (html) {
                        return html.toString();
                    })
                );
            }

            if (data.js) {
                parts.push(
                    readFile(data.js).then(function (script) {
                        return '<script>(function (bender) {' + script +
                            '})(window.bender || {});</script>';
                    })
                );
            }

            return when
                .all(parts)
                .then(combine);
        };
    }
};
