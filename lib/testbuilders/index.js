/**
 * @file Indexing file for default test builders
 */

var fs = require('fs'),
    path = require('path');

module.exports = {
    name: 'testbuilders',

    attach: function () {
        var bender = this;

        bender.testbuilders = [];

        // include default test builders
        fs.readdirSync(__dirname).forEach(function (file) {
            if (file === 'index.js') return;

            bender.use(require(path.join(__dirname, file)));
        });
    }
};
