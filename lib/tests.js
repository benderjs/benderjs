/**
 * @file Manages tests
 */

var _ = require('lodash'),
    path = require('path'),
    glob = require('glob'),
    watch = require('node-watch'),
    when = require('when'),
    whenKeys = require('when/keys'),
    whenNode = require('when/node'),
    log = require('./logger');

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
    this.running = false;

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
defaultBuilder = function (paths) {
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

module.exports = {
    name: 'tests',

    attach: function () {
        var bender = this,
            tests = bender.tests = {};

        if (!bender.conf) {
            log.error('Tests module requires: conf');
            process.exit(1);
        }

        tests.build = function (config) {
            tests.ready = false;
            tests.groups = {};
            tests.tests = [];

            _.forOwn(config.tests, function (group, name) {
                tests.groups[name] = tests.buildGroup(_.merge({
                    assertion: config.assertion
                }, group));
            });

            whenKeys
                .all(tests.groups)
                .done(function (result) {
                    console.log('done', result);

                    tests.ready = true;
                    bender.emit('tests:change', tests.list());

                    console.log(tests.tests);
                });
        };

        tests.buildGroup = function (group) {
            return when
                .map(group.paths, function (file) {
                    return whenNode.call(glob, '/**/', {
                        root: path.resolve(process.cwd(), file),
                        mark: true
                    });
                })
                .then(function (result) {
                    // flattern array of paths
                    return [].concat.apply([], result);
                })
                // TODO pipeline tests through the builders
                .then(function (result) {
                    var group = {
                        tests: {}
                    };

                    // TODO maybe there's a better way?
                    result.forEach(function (test) {
                        group.tests[test.id] = test;
                        tests.tests.push(test);
                    });


                    return group;
                });
        };

        tests.validate = function (config) {
            _.forOwn(config.tests, function (group, name) {
                if (group && !group.paths || !group.paths.length) {
                    log.error('Invalid configuration file - invalid test groups defined:', name);
                    process.exit(1);
                }
            });
        };

        tests.get = function (id) {
            var result = null;

            if (_.isString(id)) {
                return tests.tests.filter(function (test) {
                    return test.id === id;
                });
            }

            if (_.isArray(id)) {
                return tests.tests.filter(function (test) {
                    return ids.indexOf(id) > -1;
                });
            }

            return result;
        };

        tests.list = function () {
            if (!tests.ready) return null;

            return tests.groups;
        };
    },

    init: function (done) {
        var bender = this;

        bender.tests.validate(bender.conf);
        bender.tests.build(bender.conf);
        done();
    }
};
