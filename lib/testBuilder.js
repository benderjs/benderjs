var glob = require('glob'),
    path = require('path'),
    watch = require('node-watch'),
    config = require('./config'),
    tests = require('./tests');

function TestBuilder() {
}

TestBuilder.prototype.build = function() {
    var options = {
            cwd: config.basePath
        },
        tests = {},
        getList = function (pattern) {
            
            // add pattern to directories
            // TODO is it really good idea? maybe whe should left this decission to the user?
            if (pattern.charAt(pattern.length - 1) === '/') {
                pattern += '**.*';
            }

            this.tests = this.tests.concat(glob.sync(pattern, options));
        },
        name;

    for (name in config.tests) {
        group = config.tests[name];
        if (group !== undefined) {
            tests[name] = {
                files: [],
                tests: []
            };
            group.paths.forEach(getList.bind(tests[name]));
        }
    }

    console.log('tests', tests);
};

TestBuilder.prototype.watch = function () {
    watch(config.basePath, this.build);
};

module.exports = new TestBuilder();
