var _ = require('lodash'),
    glob = require('glob'),
    path = require('path'),
    send = require('send'),
    config = require('./config'),
    applications = require('./applications'),
    log = require('./logger').create('tests');

/**
 * Test
 * @param {String} id           Test id
 * @param {Object} options      Test properties
 * @param {String} options.js   Path to test's JS file
 * @param {String} options.html Path to test's HTML file
 * @param {String} options.desc Path to test's scenario (MD file)
 * @constructor
 */
function Test(id, options) {
    this.id = id;
    this.js = options.js; // TODO cache js content here ?
    this.html = options.html; // TODO cache html content here ?
    this.desc = options.desc; // TODO cache md content here ?
    this.manual = options.desc && (options.js || options.html);
    this.tags = null;
    this.apps = null;

    // TODO parse tags in source files
}

/**
 * Get all apps required by this test
 * @return {Array.<Application>}
 */
Test.prototype.getApps = function () {
    return applications.get(this.apps);
};



/**
 * Group of tests
 * @param {String}         name                Name of the group
 * @param {Object}         options             Group properties
 * @param {String}         [options.assertion] Group's assertion
 * @param {Array.<String>} options.paths       Array of test directory paths
 * @constructor
 */
function TestGroup(name, options) {
    this.name = name;
    this.assertion = options.assertion || config.assertion;
    this.filePaths = [];
    this.testPaths = [];
    this.tests = {};

    this.buildPaths(options.paths);
    // TODO create tests
}

/**
 * Build paths to test files
 * @param {Array.<String>} paths Array of test directory paths
 */
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
/**
 * Build tests for given paths
 * @param {Array.<String>} paths Paths to all files in test group's directories
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

/**
 * List all tests in the group
 * @return {Array.<Object>}
 */
TestGroup.prototype.listTests = function () {
    var result = [],
        test,
        t;

    for (t in this.tests) {
        test = this.tests[t];

        if (test) {
            result.push({
                id: test.id,
                tags: test.tags || ''
            });
        }
    }

    return result;
};

/**
 * Get a test/tests with given id(s)
 * @param  {String|Array.<String>} id Test id(s)
 * @return {Test|Array.<Test>}
 */
TestGroup.prototype.get = function (id) {
    var result;

    if (_.isString(id)) {
        return this.tests[id] || null;
    }

    if (_.isArray(id)) {
        result = [];

        _.forOwn(this.tests, function (test, name) {
            if (id.indexOf(name) > -1) result.push(test);
        });

        return result;
    }

    return null;
};

/**
 * Watch for changes in files of the given group
 * @todo
 */
TestGroup.prototype.watch = function () {
    // TODO add gaze - https://github.com/shama/gaze
};




/**
 * Test handler
 * @constructor
 */
function TestHandler() {
    this.groups = {};
    this.tests = {};
}

/**
 * Validate test groups defined in the configuration file
 * @return {Boolean}
 */
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

/**
 * Create test groups based on the configuration file
 */
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

/**
 * Create a HTTP handler that servers test context and files
 * @return {Function}
 */
TestHandler.prototype.create = function () {
    this.build();

    return function (req, res, next) {
        var url = req.url.split('/'),
            testId,
            test;

        url.shift();

        if (req.method !== 'GET' || url[0] !== 'tests') return next();
        
        testId = url.slice(1).join('/');

        test = this.get(
            decodeURIComponent(testId)
        );

        if (test) {
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
        // host assets from a test directory
        } else {
            send(req, testId).pipe(res);
        }

    }.bind(this);
};

/**
 * Get a test/tests with given id(s)
 * @param  {String|Array.<String} id Test id(s)
 * @return {Test|Array.<Test>|Null}
 */
TestHandler.prototype.get = function (id) {
    var result = null;

    if (_.isString(id)) {
        _.forOwn(this.groups, function (group) {
            result = group.get(id);
            if (result) return false; // exit the loop
        });
    }

    if (_.isArray(id)) {
        result = [];
        _.forOwn(this.groups, function (group) {
            var tests = group.get(id);
            if (tests.length) result = result.concat(tests);
        });
    }

    return result;
};

/**
 * List all the test names grouped
 * @return {Array.<Object>}
 */
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

    return result;
};

module.exports = new TestHandler();
