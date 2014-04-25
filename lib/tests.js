/**
 * @file Manages tests
 */

var _ = require('lodash'),
    path = require('path'),
    glob = require('glob'),
    watch = require('node-watch'),
    when = require('when'),
    whenAll = require('when/keys').all,
    whenCall = require('when/node').call,
    pipeline = require('when/pipeline'),
    Datastore = require('nedb'),

    log = require('./logger').create('tests', true);

module.exports = {
    name: 'tests',

    attach: function () {
        var bender = this,
            tests = bender.tests = {},
            db;

        bender.checkDeps(module.exports.name, 'builders', 'cache', 'conf');

        tests.db = db = new Datastore({
            // TODO
            // inMemoryOnly mode for now
            // filename: path.join(process.cwd(), '.bender/tests.db'),
            // autoload: true
        });

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

            bender.tests.paths = paths;

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

            // create promises for all test groups
            _.forOwn(config.tests, function (group, name) {
                groups[name] = tests.buildGroup(_.merge({
                    // use default assertion when none specified in config
                    assertion: config.assertion,
                    name: name
                }, group));
            });

            whenAll(groups)
                .done(function () {
                    tests.ready = true;
                    log.info('rebuilt');
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
                return whenCall(glob, path.join(dir, '**/*.*'), {
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
                var applications = Array.isArray(group.applications) ?
                        group.applications : [group.applications],
                    tests = [];

                _.forOwn(filelist.tests, function (test, id) {
                    test.id = id;
                    test.assertion = group.assertion;
                    test.applications = applications;
                    test.group = group.name;
                    
                    tests.push(test);
                });

                return whenCall(db.insert.bind(db), tests);
            }

            return when
                .map(group.paths, getPaths)
                .then(prepareFileList)
                .then(runBuilders)
                .then(createGroup);
        };

        /**
         * Validate configuration tests
         * @param {Object} config Bender configuration
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
         * @param  {String} id Test id(s)
         * @return {Promise}
         */
        tests.get = function (id) {
            return whenCall(db.findOne.bind(db), { id: id });
        };

        /**
         * List all the tests
         * @return {Promise}
         */
        tests.list = function () {
            var query;

            if (!tests.ready) return when.resolve([]);

            query = db.find({}).sort({ group: 1, id: 1 });

            return whenCall(query.exec.bind(query))
                .then(function (data) {
                    return data.map(function (test) {
                        return {
                            id: test.id,
                            tags: test.tags.join(', '),
                            group: test.group
                        };
                    });
                });
        };
    },

    init: function (done) {
        var bender = this;

        bender.tests.validate(bender.conf);
        bender.tests.build(bender.conf);
        bender.tests.watch(bender.conf);

        done();
    }
};
