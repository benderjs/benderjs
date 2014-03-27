/**
 * @file Manages tests
 */

var _ = require('lodash'),
    path = require('path'),
    glob = require('glob'),
    watch = require('node-watch'),
    when = require('when'),
    logger = require('./logger'),
    log = logger.create('tests');

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
    this.manual = !!(options.desc && (options.js || options.html));
    this.tags = [];
    this.apps = options.apps;
    this.assertion = options.assertion;

    this.parse();
}

/**
 * Parse metadata located in test's JS/HTML files
 * @todo
 */
Test.prototype.parse = function () {
    // parse metadata
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
    this.apps = Array.isArray(options.applications) ?
        options.applications : [options.applications];
    this.paths = options.paths;

    this.buildPaths(options.paths);
}

/**
 * Build paths to test files
 * @param {Array.<String>} paths Array of test directory paths
 */
TestGroup.prototype.buildPaths = function (paths) {
    this.tests = {};

    paths.forEach(function (pattern) {
        if (pattern.charAt(pattern.length - 1) !== '/') pattern += '/';

        pattern += '**/*.*';
        // pattern += '**/*.+(html|htm|js|md)';

        this.buildTests(glob.sync(pattern));
    }.bind(this));
};

TestGroup.prototype.build = function () {
    this.tests = {};

    this.paths.forEach(function (pattern) {
        if (pattern.substr(-1) !== '/') pattern += '/';
        pattern += '**/*.*';

        glob(pattern, function (files) {
            
        });
    });

    return when.map(this.paths, function (pattern) {
        if (pattern.substr(-1) !== '/') pattern += '/';
        pattern += '**/*.*';

        glob(pattern, function (files) {
            
        });

        return {
            files: glob.sync(pattern)
        };
    });
};

/**
 * Possible combinations:
 * - js
 * - js + html
 * - md + html (???)
 * - md + js
 * - md + js + html
 */
/**
 * Build tests for given paths
 * @param {Array.<String>} paths Paths to all files in test group's directories
 */
TestGroup.prototype.buildTests = function (paths) {
    var tests = {};

    // console.log('paths', paths);

    paths.forEach(function (filepath) {
        var ext = path.extname(filepath),
            id = filepath.split(ext)[0];

        if (!tests[id]) tests[id] = {};
        if (ext === '.js') tests[id].js = filepath;
        if (ext === '.html' || ext === '.htm') tests[id].html = filepath;
        if (ext === '.md') tests[id].desc = filepath;
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
            tags: test.tags.join('')
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
TestGroup.prototype.watch = function (paths) {
    paths.forEach(function (path) {
        watch(path, this.build);

        // TODO emit 'change' event so that the cache may reset
    }.bind(this));
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
 * @param {Object} tests Test groups
 * @return {Boolean}
 */
TestHandler.prototype.validate = function (tests) {
    var result = true;

    _.forOwn(tests, function (group) {
        if (group && !group.paths || !group.paths.length) {
            result = false;
            return false;
        }
    });

    return result;
};

/**
 * Create test groups based on the configuration file
 * @param {Object} tests Test groups
 */
TestHandler.prototype.build = function (config) {
    if (!this.validate(config.tests)) {
        log.error('Invalid configuration file - invalid test groups defined.');
        process.exit(1);
    }

    _.forOwn(config.tests, function (group, name) {
        this.groups[name] = new TestGroup(name, _.merge({
            assertion: config.assertion
        }, group));
    }.bind(this));

    
};

/**
 * Get a test/tests with given id(s)
 * @param  {String|Array.<String>} id Test id(s)
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

module.exports = {
    name: 'tests',

    attach: function () {
        var bender = this;

        if (!bender.conf) {
            logger.error('Tests module requires: conf');
            process.exit(1);
        }

        bender.tests = new TestHandler();
    },

    init: function (done) {
        var bender = this;

        // TODO we can do some async stuff here
        bender.tests.build(bender.conf);
        done();
    }
};
