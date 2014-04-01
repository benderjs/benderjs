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
    pipeline = require('when/pipeline'),
    log = require('./logger').create('tests', true);

module.exports = {
    name: 'tests',

    attach: function () {
        var bender = this,
            tests = bender.tests = {};

        if (!bender.conf || !bender.builders || !bender.cache) {
            log.error('Tests module requires: conf, builders, cache');
            process.exit(1);
        }

        /**
         * Start file system watcher for given configuration
         * @param  {Object} config Bender configuration
         */
        tests.watch = function (config) {
            var paths = [],
                cwd = process.cwd();

            _.forOwn(config.tests, function (group) {
                paths = paths.concat(group.paths);
            });

            paths = paths.map(function (dir) {
                return path.join(cwd, dir);
            });

            watch(paths, { followSymLinks: true }, function () {
                log.info('rebuilding tests');
                bender.cache.clear();
                tests.build(config);
            });
        };

        /**
         * Build tests for given configuration
         * @param {Object} config Bender configuration
         */
        tests.build = function (config) {
            var groups = {};

            // reset to defaults
            tests.ready = false;
            tests.groups = null;
            tests.tests = [];

            // start file watcher
            tests.watch(config);

            // create promises for all test groups
            _.forOwn(config.tests, function (group, name) {
                groups[name] = tests.buildGroup(_.merge({
                    assertion: config.assertion // use default assertion when none specified in config
                }, group));
            });

            whenKeys
                .all(groups)
                .done(function (result) {
                    tests.groups = result;
                    tests.ready = true;
                    log.info('tests rebuilt');
                    bender.emit('tests:change', result);
                });
        };

        /**
         * Build tests for given group
         * @param  {Object} group Test group object
         * @return {Promise}
         */
        tests.buildGroup = function (group) {
            // get all file paths in given directory
            function getPaths(dir) {
                return whenNode.call(glob, path.join(dir, '**/*.*'), {
                    cwd: process.cwd()
                });
            }

            // prepare group object and flattern file paths
            function prepareGroup(result) {
                return {
                    applications: Array.isArray(group.applications) ?
                        group.applications : [group.applications],
                    assertion: group.assertion,
                    files: [].concat.apply([], result),
                    tests: {}
                };
            }

            // run all the builders for given group
            function runBuilders(group) {
                return pipeline(bender.builders, group);
            }

            // modify final group object
            function createGroup(group) {
                delete group.files;

                _.forOwn(group.tests, function (test) {
                    test.assertion = group.assertion;
                    test.applications = group.applications;
                    tests.tests.push(test);
                });

                return group;
            }

            return when
                .map(group.paths, getPaths)
                .then(prepareGroup)
                .then(runBuilders)
                .then(createGroup);
        };

        /**
         * Validate configuration tests
         * @param  {Object} config Bender configuration
         */
        tests.validate = function (config) {
            _.forOwn(config.tests, function (group, name) {
                if (group && !group.paths || !group.paths.length) {
                    log.error('Invalid configuration file - invalid test groups defined:', name);
                    process.exit(1);
                }
            });
        };

        /**
         * Get test(s) for given id(s)
         * @param  {String|Array.<String>} id Test id(s)
         * @return {Object|Array.<Object>}
         */
        tests.get = function (id) {
            var result = null;

            if (_.isString(id)) {
                return tests.tests.filter(function (test) {
                    return test.id === id;
                })[0];
            }

            if (_.isArray(id)) {
                return tests.tests.filter(function (test) {
                    return id.indexOf(test.id) > -1;
                });
            }

            return result;
        };

        /**
         * List all the tests
         * @return {Object}
         */
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
