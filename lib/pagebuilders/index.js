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
                bender.pagebuilders.push(builder.build);
            };

            bender.use(builder);
        });
    }
};
