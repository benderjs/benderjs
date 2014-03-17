var glob = require('glob'),
    path = require('path'),
    watch = require('node-watch'),
    config = require('./config'),
    tests = require('./tests');

function TestBuilder() {}

// TODO consider writing more sophisticated validator...
TestBuilder.prototype.validate = function () {
    var group, name;

    for (name in config.tests) {
        group = tests[name];
        if (group) {
            if (!group.assertion || !group.paths || !group.paths.length) {
                return false;
            }
        }
    }

    return true;
};

TestBuilder.prototype.build = function () {
    var options = {
            cwd: config.basePath
        },
        extensions = /\.(html|htm|js)$/,
        groups = {},
        list = function (pattern) {
            var paths;
            
            // add a "**.*" pattern to a directory path
            // TODO is it really a good idea? maybe we should left this decission to the users?
            if (pattern.charAt(pattern.length - 1) === '/') {
                pattern += '**/*.*';
            }

            paths = glob.sync(pattern, options);

            paths.forEach(function (path) {
                this[extensions.test(path) ? 'tests' : 'files'].push(path);
            }.bind(this));
        },
        name;

    if (!this.validate()) {
        log.error('Invalid configuration file - invalid test groups.');
        process.exit(1);
    }

    for (name in config.tests) {
        if (config.tests[name]) {
            groups[name] = {
                files: [],
                tests: []
            };
            config.tests[name].paths.forEach(list.bind(groups[name]));
        }
    }

    for (name in groups) {
        // TODO add tests
        console.log(name, groups[name]);
    }
};

TestBuilder.prototype.watch = function () {
    watch(config.basePath, function () {
        this.build();
    }.bind(this));
};

module.exports = new TestBuilder();
