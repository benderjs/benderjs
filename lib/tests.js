var _ = require('lodash'),
    fs = require('fs'),
    glob = require('glob'),
    path = require('path'),
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
    this.js = options.js;
    this.html = options.html;
    this.desc = options.desc;
    this.manual = options.desc && (options.js || options.html);
    this.tags = null;
    this.apps = options.apps;
    this.assertion = options.assertion;

    this.parse();
}

/**
 * Parse metadata located in test's JS/HTML files
 * @todo
 */
Test.prototype.parse = function () {
    
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
    this.assertion = options.assertion;
    this.apps = options.applications;
    this.filePaths = [];
    this.testPaths = [];
    this.tests = {};

    this.buildPaths(options.paths);
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
    var tests = {};

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

    _.forOwn(tests, function (test, name) {
        if (test.js || (test.desc && test.html)) {
            test.apps = this.apps;
            test.assertion = this.assertion;
            this.tests[name] = new Test(name, test);
        }
    }.bind(this));
};

/**
 * List all tests in the group
 * @return {Array.<Object>}
 */
TestGroup.prototype.listTests = function () {
    var result = [];

    _.forOwn(this.tests, function (test) {
        result.push({
            id: test.id,
            tags: test.tags || ''
        });
    });

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

};



/**
 * Test handler
 * @constructor
 */
function TestHandler(config, applications, assertions) {
    this.groups = {};
    this.tests = {};
    this.config = config;
    this.applications = applications;
    this.assertions = assertions;
}

TestHandler.$inject = ['config', 'applications', 'assertion'];

/**
 * Validate test groups defined in the configuration file
 * @return {Boolean}
 */
TestHandler.prototype.validate = function () {
    var result = true;

    _.forOwn(this.config.tests, function (group) {
        if (group && !group.paths || !group.paths.length) {
            result = false;
            return false;
        }
    });

    return result;
};

/**
 * Create test groups based on the configuration file
 */
TestHandler.prototype.build = function () {
    if (!this.validate()) {
        log.error('Invalid configuration file - invalid test groups defined.');
        process.exit(1);
    }
    _.forOwn(this.config.tests, function (group, name) {
        this.groups[name] = new TestGroup(name, _.merge({
            assertion: this.config.assertion
        }, this.config.tests[name]));
    }.bind(this));
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
            var data = {
                quirks: false,
                apps: this.applications.get(test.apps),
                id: test.id,
                html: test.html && fs.readFileSync(test.html).toString(),
                js: test.js && fs.readFileSync(test.js).toString(),
                plugins: [this.assertions.get(test.assertion)]
            };

            // TODO replace this piece with proper template builder
            res.render('context.ejs', data);
        // host assets from a test directory
        } else {
            next();
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
    var result = [];

    _.forOwn(this.groups, function (group, name) {
        result.push({
            name: group.name,
            tests: group.listTests()
        });
    });

    return result;
};

module.exports = TestHandler;
