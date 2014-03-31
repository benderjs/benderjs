/**
 * Possible combinations:
 * - js
 * - js + html
 * - md + html (???)
 * - md + js
 * - md + js + html
 */
var path = require('path'),
    _ = require('lodash');

function build(data) {
    var tests = {};

    data.files.forEach(function (file) {
        var ext = path.extname(file),
            id = file.split(ext)[0];

        if (!tests[id]) {
            tests[id] = {
                id: id
            };
        }
        if (ext === '.js') tests[id].js = file;
        if (ext === '.html' || ext === '.htm') tests[id].html = file;
    });

    _.forOwn(tests, function (test, name) {
        var idx;

        if (!test.js) return;

        data.tests[name] = test;

        if (test.js && (idx = data.files.indexOf(test.js)) > -1) data.files.splice(idx, 1);
        if (test.html && (idx = data.files.indexOf(test.html)) > -1) data.files.splice(idx, 1);
    });

    return data;
}

module.exports = {

    name: 'bender-builder-default',

    attach: function () {
        var bender = this;

        if (!bender.builders) {
            console.error('Default builder module requires: builders');
            process.exit(1);
        }

        bender.builders.push(build);
    }
};
