var _ = require('lodash'),
    glob = require('glob'),
    path = require('path'),
    config = require('./config');

function Test(id, src, html, meta) {
    this.id = id;
    this.src = src;
    this.spec = ''; // TODO cache spec content here ?
    this.html = html; // TODO cache html content here ?
    this.meta = meta;
}

Test.prototype.getHtml = function () {
    // TODO read and cache test template
    return this.html;
};

Test.prototype.getSpec = function (debug) {
    return debug ? this.src : this.spec;
};



function TestHandler() {
    this.tests = [];
}

TestHandler.prototype.add = function (data) {
    this.tests.push(new Test(data));
};

TestHandler.prototype.get = function (id) {
    if (_.isString(id)) return _.where(this.tests, { id: id })[0] || null;

    if (_.isArray(id)) {
        return this.tests.filter(function (test) {
            return ids.indexOf(test.id) > -1;
        });
    }

    return null;
};

TestHandler.prototype.list = function () {
    return this.tests.map(function (test) {
        return {
            id: test.id,
            name: test.name,
            meta: test.meta
        };
    });
};

// TODO consider writing more sophisticated validator...
TestHandler.prototype.validate = function () {
    var group, name;

    for (name in config.tests) {
        group = this.tests[name];
        if (group) {
            if (!group.assertion || !group.paths || !group.paths.length) {
                return false;
            }
        }
    }

    return true;
};

TestHandler.prototype.build = function () {
    var extensions = /\.(html|htm|js)$/,
        groups = {},
        list = function (pattern) {
            var paths;
            
            // add a "**.*" pattern to a directory path
            // TODO is it really a good idea? maybe we should left this decission to the users?
            if (pattern.charAt(pattern.length - 1) === '/') {
                pattern += '**/*.*';
            }

            paths = glob.sync(pattern);

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

TestHandler.prototype.watch = function () {
    // TODO add gaze - https://github.com/shama/gaze
};

TestHandler.prototype.create = function () {
    var pattern = /^\/tests\/([\w-_\/]+)(?:.js)$/;

    this.build();
    this.watch();

    return function (req, res, next) {
        var match = pattern.exec(req.url),
            test;

        if (req.method === 'GET' && match && (test = tests.get(match[1]))) {
            res.render('context.ejs', {
                quirks: false, // TODO how to set it properly?
                debug: false,
                app: applicationHandler.get('myApp'), // TODO where to get app name(s)?!
                plugins: this.getPlugins(),
                scripts: this.getScripts(),
                id: test.id,
                html: test.getHtml(),
                spec: test.getSpec(debug)
            });
        } else {
            next();
        }
    }.bind(this);
};

TestHandler.prototype.getScripts = function () {
    // TODO return resources which should be loaded in the test context
    return [];
};

TestHandler.prototype.getPlugins = function () {
    // TODO return all plugins which should be loaded in the test context
    return [];
};

module.exports = new TestHandler();
