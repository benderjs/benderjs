var _ = require('lodash'),
    glob = require('glob'),
    path = require('path'),
    send = require('send'),
    config = require('./config'),
    applications = require('./applications'),
    log = require('./logger').create('tests');

function Test(id, options) {
    this.id = id;
    this.js = options.js;
    this.html = options.html; // TODO cache html content here ?
    this.desc = options.desc;
    this.manual = options.desc && (options.js || options.html);
    this.tags = null;
    this.apps = null;

    // TODO parse tags in source files
}

Test.prototype.getApps = function () {
    return applications.get(this.apps);
};



function TestGroup(name, options) {
    this.name = name;
    this.assertion = options.assertion || config.assertion;
    this.filePaths = [];
    this.testPaths = [];
    this.tests = {};

    this.buildPaths(options.paths);
    // TODO create tests
}

TestGroup.prototype.buildPaths = function (paths) {
    paths.forEach(function (pattern) {
        if (pattern.charAt(pattern.length - 1) !== '/') pattern += '/';

        pattern += '**/*.+(html|htm|js|md)';

        this.buildTests(glob.sync(pattern));
    }.bind(this));
};

/**
 * Possible combinations:
 * - js
 * - js + html
 * - md + html
 * - js + html
 * - md + js + html
 */

TestGroup.prototype.buildTests = function (paths) {
    var tests = {},
        name,
        test;

    paths.forEach(function (path) {
        var parts = path.split('.'),
            ext = parts.pop(),
            id = parts.join('.');

        if (!tests[id]) {
            tests[id] = {};
        }

        if (ext === 'js') tests[id].js = path;
        if (ext === 'html' || ext === 'htm') tests[id].html = path;
        if (ext === 'md') tests[id].desc = path;

    });

    for (name in tests) {
        test = tests[name];
        if (test.js || (test.desc && test.html)) {
            this.tests[name] = new Test(name, test);
        }
    }
    // TODO parse the file path, strip the extension, group by path and create a test, parse metadata
};

TestGroup.prototype.listTests = function () {
    var result = [],
        test,
        t;

    for (t in this.tests) {
        test = this.tests[t];

        if (test) {
            result.push({
                id: test.id,
                tags: test.tags
            });
        }
    }

    return result;
};



function TestHandler() {
    this.groups = {};
}

// TODO consider writing more sophisticated validator...
TestHandler.prototype.validate = function () {
    var group, name;

    for (name in config.tests) {
        group = config.tests[name];
        if (group && !group.paths || !group.paths.length) {
            return false;
        }
    }

    return true;
};

TestHandler.prototype.build = function () {
    var name;

    if (!this.validate()) {
        log.error('Invalid configuration file - invalid test groups defined.');
        process.exit(1);
    }

    for (name in config.tests) {
        if (config.tests[name]) {
            this.groups[name] = new TestGroup(name, config.tests[name]);
        }
    }
};

TestHandler.prototype.watch = function () {
    // TODO add gaze - https://github.com/shama/gaze
};

TestHandler.prototype.create = function () {
    this.build();
    this.watch();

    return function (req, res, next) {
        var url = req.url.split('/'),
            group,
            testId,
            test;

        url.shift();

        if (req.method !== 'GET' || url[0] !== 'tests') return next();
        
        group = url[1];
        testId = url.slice(2).join('/');

        test = this.get(
            decodeURIComponent(group),
            decodeURIComponent(testId)
        );

        if (!test) return next();

        // TODO replace this piece with proper template builder
        res.render('context.ejs', {
            quirks: false,
            app: test.getApps(),
            id: test.id,
            html: test.html,
            js: test.js,
            scripts: null,
            plugins: null
        });

    }.bind(this);
};

TestHandler.prototype.get = function (name, id) {
    var group = this.groups[name];

    return group && group.tests[id] || null;
};

TestHandler.prototype.list = function () {
    var result = [],
        group,
        name;

    for (name in this.groups) {
        group = this.groups[name];
        if (group) {
            result.push({
                name: group.name,
                tests: group.listTests()
            });
        }
    }

    console.log(result);

    return result;
};

module.exports = new TestHandler();
