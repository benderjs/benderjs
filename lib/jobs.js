var path = require('path'),
    fs = require('fs'),
    when = require('when'),
    whenNode = require('when/node'),
    mkdir = whenNode.lift(fs.mkdir),
    whenCall = whenNode.call,
    cwd = process.cwd(),
    Datastore = require('nedb'),
    jobsDir = path.join(cwd, '/.bender/jobs/');

module.exports = {

    name: 'jobs',

    attach: function () {
        var bender = this,
            jobs = bender.jobs = {},
            jobsDb = new Datastore({
                filename: path.join(cwd, '/.bender/jobs.db'),
                autoload: true
            }),
            tasksDb = new Datastore({
                filename: path.join(cwd, '/.bender/tasks.db'),
                autoload: true
            }),
            taskBrowsersDb = new Datastore({
                filename: path.join(cwd, '/.bender/task_browsers.db'),
                autoload: true
            }),
            testsDb;

        bender.checkDeps(module.exports.name, 'tests', 'cache');

        testsDb = bender.tests.db;

        // yeah, that probably could be async...
        if (!fs.existsSync(jobsDir)) fs.mkdirSync(jobsDir);

        jobs.STATUS = {
            WAITING: 0,
            PENDING: 1,
            PASSED: 2,
            FAILED: 3
        };

        /**
         * Create new job
         * @param  {Object} data               Job properties
         * @param  {Array}  data.tests         Job tests
         * @param  {Array}  data.browsers      Job browsers
         * @param  {String} [data.description] Job description
         * @return {Promise}
         */
        jobs.create = function (data) {
            var job = {
                    description: data.description,
                    created: +new Date()
                },
                dir,
                id;

            function prepareDir(job) {
                id = job._id;
                dir = path.join(jobsDir, id);

                return mkdir(dir)
                    .then(function () {
                        return mkdir(path.join(dir, 'tests'));
                    })
                    .then(function () {
                        return mkdir(path.join(dir, 'apps'));
                    })
                    .then(function () {
                        return mkdir(path.join(dir, 'cache'));
                    });
            }

            function insertTasks(tests) {
                return whenCall(tasksDb.insert.bind(tasksDb), tests.map(prepareTask));
            }

            function prepareTask(task) {
                delete task._id;
                delete task.tags;
                delete task.group;

                task.jobId = id;
                task.created = +new Date();

                return task;
            }

            function fillTasksDb() {
                return whenCall(testsDb.find.bind(testsDb), { id: { $in: data.tests } })
                    .then(insertTasks);
            }

            function fillTaskBrowsersDb(tasks) {
                var pattern = /^([a-z]+)(\d*)/i;

                function insertTaskBrowsers(task) {
                    var browsers = data.browsers.map(function (browser) {
                        var match = pattern.exec(browser);

                        if (!match) return null;

                        return {
                            name: match[1].toLowerCase(),
                            version: match[2] || 0,
                            taskId: task._id,
                            status: 0,
                            created: +new Date()
                        };
                    });

                    return whenCall(taskBrowsersDb.insert.bind(taskBrowsersDb), browsers);
                }

                return when.map(tasks, insertTaskBrowsers);
            }

            // TODO copy all required test files - what about assets?!
            function copyTests() {
                return when.resolve();
            }

            // TODO copy current application files - what about proxied apps?!
            function copyApps() {
                return when.resolve();
            }

            return whenCall(jobsDb.insert.bind(jobsDb), job)
                .then(prepareDir)
                .then(fillTasksDb)
                .then(fillTaskBrowsersDb)
                .then(copyTests)
                .then(copyApps)
                .then(function () {
                    return id;
                });
        };

        /**
         * List all the jobs
         * @return {Promise}
         */
        jobs.list = function () {
            return whenCall(jobsDb.find.bind(jobsDb), {})
                .then(jobs.getResults)
                .then(function (results) {
                    return when.map(results, jobs.compactResults);
                });
        };

        /**
         * Get a job
         * @param  {String} id Job ID
         * @return {Promise}
         */
        jobs.get = function (id) {
            return whenCall(jobsDb.findOne.bind(jobsDb), { _id: id })
                .then(function (job) {
                    return job ? jobs.getResults([job]) : when.resolve([null]);
                })
                .then(function (results) {
                    return results[0];
                });
        };

        /**
         * Get results for a given job
         * @param  {Array.<Object>} data Bender jobs array
         * @return {Promise}
         */
        jobs.getResults = function (data) {
            var jobIds = data.map(function (result) {
                    return result._id;
                });

            function buildTasks(tasks) {
                var taskIds = tasks.map(function (task) {
                        return task._id;
                    });

                function buildResults(results) {
                    tasks.forEach(function (task) {
                        task.results = results.filter(function (result) {
                            return result.taskId === task._id;
                        });
                    });

                    data.forEach(function (job) {
                        job.tasks = tasks.filter(function (task) {
                            return task.jobId === job._id;
                        });
                    });

                    return data;
                }

                return whenCall(
                        taskBrowsersDb.find.bind(taskBrowsersDb), {
                        taskId: { $in: taskIds }
                    })
                    .then(buildResults);
            }

            return whenCall(
                    tasksDb.find.bind(tasksDb), {
                    jobId: { $in: jobIds }
                })
                .then(buildTasks);
        };

        /**
         * Compact the results of a job by grouping them by browsers
         * @param  {Object} job Bender job
         * @return {Promise}
         */
        jobs.compactResults = function (job) {
            var results = {};

            function buildResult(result) {
                var browserId = result.name + '_' + result.version,
                    res = results[browserId];

                if (!res) results[browserId] = res = result;

                if (result.status === jobs.STATUS.PENDING ||
                    (result.status === jobs.STATUS.FAILED &&
                    res.status !== jobs.STATUS.PENDING))
                    res.status = result.status;
            }

            job.tasks.forEach(function (task) {
                task.results.forEach(buildResult);
            });

            job.results = Object.keys(results)
                .sort()
                .map(function (name) {
                    return results[name];
                });

            delete job.tasks;

            return job;
        };

        /**
         * Fetch a task for a client
         * @param {Object} client Bender client
         */
        jobs.fetch = function (client) {
            function handleBrowserTask(err, result) {
                if (err || !result) return;

                function updateTask(err, task) {
                    if (err || !task) return;

                    function run(err, count) {
                        if (err || !count) return;

                        bender.emit('job:run', client.id, {
                            id: task.id,
                            tbId: result._id
                        });
                    }

                    taskBrowsersDb.update(
                        { _id: result._id },
                        { $set: { status: 1 } },
                        run
                    );
                }

                tasksDb.findOne({ _id: result.taskId }, updateTask);
            }

            taskBrowsersDb
                .findOne({
                    $and: [
                        { name: client.browser },
                        { status: 0 },
                        { version: { $in: [client.version, 0] } }
                    ]
                })
                .sort({ created: 1 })
                .exec(handleBrowserTask);
        };

        /**
         * Complete a browser task
         * @param {Object}  data Task data
         * @param {String}  data.tbId Task id
         * @param {Boolean} data.success Completed successfully
         */
        jobs.completeTask = function (data) {
            taskBrowsersDb.update(
                { _id: data.tbId },
                { $set: { status: data.success ? 2 : 3 } },
                function () {}
            );
        };
    },

    init: function (done) {
        var bender = this;

        bender.on('client:fetch', bender.jobs.fetch);
        bender.on('client:complete', bender.jobs.completeTask);

        done();
    }
};
