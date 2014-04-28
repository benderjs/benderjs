/**
 * @file Indexing file for default HTTP Server middleware
 */

var fs = require('fs'),
    path = require('path');

module.exports = {
    name: 'middleware',

    attach: function () {
        var bender = this;

        bender.middleware = [];

        // include default middleware
        fs.readdirSync(__dirname).forEach(function (file) {
            if (file === 'index.js') return;

            bender.use(require(path.join(__dirname, file)));
        });
    }
};
