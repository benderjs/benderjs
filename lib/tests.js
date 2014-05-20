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
            isRebuilding = false,
            waitingForRebuild = false,
            db;

        bender.checkDeps(module.exports.name, 'testbuilders', 'cache', 'conf');

        tests.db = db = new Datastore({
            // TODO
            // inMemoryOnly mode for now
            // filename: path.join(process.cwd(), '.bender/tests.db'),
            // autoload: true
        });

        /**
         * Start file system watcher for given configuration
         */
        tests.watch = function () {
            var paths = Object.keys(bender.conf.tests)
                    .reduce(function (result, name) {
                        var dir = bender.conf.tests[name].basePath;

                        if (result.indexOf(dir) === -1) result.push(dir);

                        return result;
                    }, []);

            watch(paths, { followSymLinks: true }, tests.rebuild);
        };

        /**
         * Rebuild the tests database
         */
        tests.rebuild = function () {
            log.info('rebuilding tests');

            if (isRebuilding) {
                waitingForRebuild = true;
                return;
            }

            isRebuilding = true;

            db.remove({}, { multi: true }, function (err) {
                if (err)
                    return log.error('error while cleaning tests database:', err);

                bender.cache
                    .clear()
                    .done(tests.build);
            });
        };

        /**
         * Build tests found in Bender configuration
         */
        tests.build = function () {
            var groups = {};

            tests.ready = false;

            // create promises for all test groups
            _.forOwn(bender.conf.tests, function (group, name) {
                groups[name] = tests.buildGroup(_.merge({
                    // use default assertion when none specified in config
                    assertion: bender.conf.assertion,
                    name: name
                }, group));
            });

            whenAll(groups)
                .done(function () {
                    tests.ready = true;
                    isRebuilding = false;
                    log.info('rebuilt');

                    if (waitingForRebuild) {
                        waitingForRebuild = false;
                        tests.rebuild();
                    }
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
                if (dir.charAt(0) === '!') return when.resolve(dir);

                return whenCall(
                    glob,
                    dir.slice(-1) === '/' ?
                        path.join(group.basePath, dir, '**/*.*') : dir,
                    { cwd: process.cwd() }
                );
            }

            // prepare file list object consumed by test builders
            function prepareFileList(results) {
                var files = [].concat.apply([], results),
                    excludes = [],
                    pattern;

                results.forEach(function (result) {
                    if (typeof result == 'string' && result.charAt(0) === '!')
                        excludes.push(result.slice(1));
                });

                // manage exclude paths (the one starting with '!')
                if (excludes.length) {
                    pattern = new RegExp(excludes.join('|'), 'i');

                    files = files.filter(function (file) {
                        return !pattern.exec(file);
                    });
                }

                return _.merge(_.cloneDeep(group), {
                    files: files,
                    tests: {}
                });
            }

            // run all the builders with given file list
            function runBuilders(filelist) {
                return pipeline(bender.testbuilders, filelist);
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

        bender.tests.build();
        try {
            bender.tests.watch();
        } catch (e) {
            if (e.code === 'ENOSPC') {
                log.error('Watch number exceeded, try increasing it with:');
                log.error('echo <number> | sudo tee /proc/sys/fs/inotify/max_user_watches');
                process.exit(1);
            } else {
                throw e;
            }
        }


        done();
    }
};
