/**
 * @file Indexing file for default HTTP Server middleware
 */

var fs = require('fs'),
    path = require('path');

module.exports = {
    name: 'middleware',

    attach: function () {
        var bender = this;

        bender.middleware = {};

        // include default middleware
        fs.readdirSync(__dirname).forEach(function (file) {
            var middleware;

            if (file === 'index.js') return;

            middleware = require(path.join(__dirname, file));

            middleware.attach = middleware.attach || function () {
                var name = middleware.name.replace('bender-middleware-', '');
                
                bender.middleware[name] = middleware.create;
            };

            bender.use(middleware);
        });
    }
};
