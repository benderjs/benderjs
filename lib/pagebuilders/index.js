/**
 * @file Indexing file for default page builders
 */

var fs = require('fs'),
    path = require('path');

module.exports = {
    name: 'pagebuilders',

    attach: function () {
        var bender = this;

        bender.pagebuilders = [];

        // include default page builders
        fs.readdirSync(__dirname).forEach(function (file) {
            var builder;

            if (file === 'index.js') return;

            builder = require(path.join(__dirname, file));

            builder.attach = builder.attach || function () {
                var html = bender.plugins['bender-pagebuilder-html'],
                    idx;

                // add plugin before pagebuilder-html
                if (html && (idx = bender.pagebuilders.indexOf(html.build)) > -1) {
                    bender.pagebuilders.splice(idx, 0, builder.build);
                } else {
                    bender.pagebuilders.push(builder.build);
                }
            };

            bender.use(builder);
        });
    }
};
