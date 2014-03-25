/**
 * @file Indexing file for HTTP Server middlewares
 */
var fs = require('fs'),
    path = require('path');

fs.readdirSync(__dirname).forEach(function (file) {
    if (file === 'index.js') return;

    module.exports[path.basename(file, '.js')] = require(path.join(__dirname, file));
});
