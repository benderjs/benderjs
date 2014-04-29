var fs = require('fs'),
    path = require('path'),
    when = require('when'),
    readFile = require('when/node').lift(fs.readFile),
    combine = require('dom-combiner');

module.exports = {
    name: 'template',

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
                head;

            // default template
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

            // head section
            head = ['<head>'];
            data.head.forEach(function addToHead(src) {
                src.css.forEach(function (css) {
                    head.push('<link rel="stylesheet" href="' + css + '">');
                });
                src.js.forEach(function (js) {
                    head.push('<script src="' + js + '"></script>');
                });
            });
            head.push('</head>');
            parts.push(head.join(''));

            // test html
            if (data.html) {
                parts.push(
                    readFile(data.html).then(function (html) {
                        return html.toString();
                    })
                );
            }

            // test script
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
