var path = require('path'),
    _ = require('lodash'),
    builder;

/**
 * Default test build for given group
 * @param  {Object} data Group object
 * @return {Object}
 */
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

module.exports = builder = {

    name: 'bender-testbuilder-default',
    build: build,

    attach: function () {
        var bender = this;

        bender.checkDeps(builder.name, 'testbuilders');

        // add the default builder at the beginning
        bender.testbuilders.unshift(builder.build);
    }
};
