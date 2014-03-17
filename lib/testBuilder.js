var glob = require('glob'),
    path = require('path'),
    watch = require('node-watch'),
    config = require('./config'),
    tests = require('./tests');

function TestBuilder() {}

TestBuilder.prototype.build = function() {
    var options = {
            cwd: config.basePath
        },
        tests = {},
        getList = function (pattern) {
            
            // add a "**.*" pattern to a directory path
            // TODO is it really a good idea? maybe we should left this decission to the user?
            if (pattern.charAt(pattern.length - 1) === '/') {
                pattern += '**.*';
            }

            this.tests = this.tests.concat(glob.sync(pattern, options));
        },
        name;

    for (name in config.tests) {
        if (config.tests[name] !== undefined) {
            tests[name] = {
                files: [],
                tests: []
            };
            config.tests[name].paths.forEach(getList.bind(tests[name]));
        }
    }

    // TODO store the tests somewhere
    console.log('tests', tests);
};

TestBuilder.prototype.watch = function () {
    watch(config.basePath, this.build);
};

module.exports = new TestBuilder();
