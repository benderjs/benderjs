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

        bender.checkDeps(module.exports.name, 'builders', 'cache', 'clients', 'conf');

        /**
         * Test case
         * @param {String} id      Test id
         * @param {Object} options Test configuration
         * @constructor
         */
        function Test(id, options) {
            this.id = id;
            this.queue = [];

            _.merge(this, options);
        }

        /**
         * Check if test is still running (in queue)
         * @return {Boolean}
         */
        Test.prototype.isRunning = function () {
            return !!this.queue.length;
        };



        /**
         * Start file system watcher for given configuration
         * @param {Object} config Bender configuration
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

                bender.cache
                    .clear()
                    .done(function () {
                        tests.build(config);
                    });
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
                    // use default assertion when none specified in config
                    assertion: config.assertion,
                    name: name
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

            // prepare file list object consumed by test builders
            function prepareFileList(result) {
                var files = [].concat.apply([], result);

                // TODO store files in a cache file to compare it before next launch
                // and clear cache if necessary

                return {
                    files: files,
                    tests: {}
                };
            }

            // run all the builders with given file list
            function runBuilders(filelist) {
                return pipeline(bender.builders, filelist);
            }

            // create final group object
            function createGroup(filelist) {
                var data = {
                        applications: Array.isArray(group.applications) ?
                            group.applications : [group.applications],
                        assertion: group.assertion,
                        name: group.name,
                        tests: filelist.tests
                    };

                _.forOwn(filelist.tests, function (test, id) {
                    test.assertion = data.assertion;
                    test.applications = data.applications;
                    test.group = group.name;
                    data.tests[id] = new Test(id, test);
                    tests.tests.push(data.tests[id]);
                });

                return data;
            }

            return when
                .map(group.paths, getPaths)
                .then(prepareFileList)
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

            return Object.keys(tests.groups)
                .reduce(function (result, current) {
                    return result.concat(Object.keys(tests.groups[current].tests)
                        .map(function (id) {
                            var test = tests.groups[current].tests[id];

                            return {
                                id: test.id,
                                tags: test.tags,
                                group: test.group
                            };
                        }));
                }, []);

            // return Object.keys(tests.groups).map(function (name) {
            //     var group = tests.groups[name];
            //     return {
            //         name: name,
            //         tests: Object.keys(group.tests).map(function (id) {
            //             return group.tests[id];
            //         })
            //     };
            // });
        };

        /**
         * [run description]
         * @param {Array.<String>} ids Test ids
         */
        tests.run = function (ids) {
            var list = tests.get(ids);

            list.forEach(function (test) {
                // add connected clients to test queue
                test.queue = bender.clients.list();
            });
        };

        /**
         * Update test status
         * @param {Object} result Result object
         */
        tests.endTest = function (result) {
            var test = tests.get(result.id),
                idx = test.queue.indexOf(result.client);

            if (idx > -1) {
                test.queue.splice(idx, 1);

                bender.emit('test:update', {
                    id: test.id,
                    running: test.isRunning()
                });
            }
        };
    },

    init: function (done) {
        var bender = this;

        bender.tests.validate(bender.conf);
        bender.tests.build(bender.conf);
        
        bender.on('test:run', bender.tests.run);
        bender.on('test:result', bender.tests.endTest);

        done();
    }
};
