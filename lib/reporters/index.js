/**
 * @file Indexing file for default Bender reporters
 */
var fs = require('fs'),
    path = require('path');

module.exports.modules = [];

fs.readdirSync(__dirname).forEach(function (file) {
    var reporter;

    if (file === 'index.js') return;

    reporter = require(path.join(__dirname, file));

    reporter.attach = reporter.attach || function () {
        var bender = this;

        bender.onAny(function () {
            if (typeof reporter[this.event] == 'function') {
                reporter[this.event].apply(bender, arguments);
            }
        });
    };

    module.exports[path.basename(file, '.js')] = reporter;
    module.exports.modules.push(reporter);
});
