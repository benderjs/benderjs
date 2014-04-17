var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    when = require('when'),
    whenNode = require('when/node'),
    mkdir = whenNode.lift(fs.mkdir),

    cwd = process.cwd(),

    Datastore = require('nedb'),

    jobsDir = path.join(cwd, '/.bender/jobs/'),

    log = require('./logger').create('jobs', true);


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

        bender.checkDeps(module.exports.name, 'tests', 'cache', 'browsers');

        testsDb = bender.tests.db;

        // yeah, that probably could be async...
        if (!fs.existsSync(jobsDir)) fs.mkdirSync(jobsDir);

        jobs.STATUS = {
            WAITING: 0,
            PENDING: 1,
            PASSED: 2,
            FAILED: 3
        };

        jobs.create = function (data, complete) {
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
                return whenNode
                    .call(tasksDb.insert.bind(tasksDb), tests.map(prepareTask));
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
                return whenNode.call(testsDb.find.bind(testsDb), { id: { $in: data.tests } })
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

                    return whenNode
                        .call(taskBrowsersDb.insert.bind(taskBrowsersDb), browsers);
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

            function notify() {
                complete(id);

                jobs.list()
                    .done(function (jobs) {
                        bender.emit('jobs:change', jobs);
                    });
            }

            whenNode
                .call(jobsDb.insert.bind(jobsDb), job)
                .then(prepareDir)
                .then(fillTasksDb)
                .then(fillTaskBrowsersDb)
                .then(copyTests)
                .then(copyApps)
                .done(notify);
        };

        jobs.list = function () {
            return whenNode
                .call(jobsDb.find.bind(jobsDb), {})
                .then(function (results) {
                    return when.map(results, jobs.buildResults);
                });
        };

        jobs.buildResults = function (job) {
            function prepareTask(task) {
                return whenNode
                    .call(
                        taskBrowsersDb.find.bind(taskBrowsersDb),
                        { taskId: task._id }
                    )
                    .then(function (browsers) {
                        task.results = browsers;
                        return task;
                    });
            }

            function prepareResults(tasks) {
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

                tasks.forEach(function (task) {
                    task.results.forEach(buildResult);
                });

                job.results = Object.keys(results)
                    .sort()
                    .map(function (name) {
                        return results[name];
                    });

                return job;
            }

            return whenNode
                .call(tasksDb.find.bind(tasksDb), { jobId: job._id })
                .then(function (tasks) {
                    return when.map(tasks, prepareTask);
                })
                .then(prepareResults);
        };

        jobs.fetch = function (id) {
            var client = bender.browsers.clients.find('id', id)[0];

            if (!client) return;

            function handleBrowserTask(err, result) {
                if (err || !result) return;

                function updateTask(task) {
                    function notify(err, count) {
                        if (err || !count) return;

                        jobs.get(task.jobId).then(function (job) {
                            bender.emit('job:change', job);
                        });

                        bender.emit('job:run', id, {
                            id: task.id,
                            tbId: result._id
                        });
                    }

                    taskBrowsersDb.update(
                        { _id: result._id },
                        { $set: { status: 1 } },
                        notify
                    );
                }

                whenNode
                    .call(tasksDb.findOne.bind(tasksDb), { _id: result.taskId })
                    .done(updateTask);
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

        jobs.completeTask = function (id, data) {
            var client = bender.browsers.clients.find('id', id)[0];

            function notify(err, count) {
                if (err || !count) return;

                taskBrowsersDb.findOne({ _id: data.tbId }, function (err, result) {
                    if (err || !result) return;

                    tasksDb.findOne({ _id: result.taskId }, function (err, task) {
                        if (err || !task) return;

                        jobs.get(task.jobId).then(function (job) {
                            bender.emit('job:change', job);
                        });
                    });
                });
            }

            taskBrowsersDb.update(
                { _id: data.tbId },
                { $set: { status: data.success ? 2 : 3 } },
                notify
            );
        };

        jobs.get = function (id) {
            return whenNode
                .call(jobsDb.findOne.bind(jobsDb), { _id: id })
                .then(jobs.buildResults);
        };
    },

    init: function (done) {
        var bender = this;

        bender.on('job:create', bender.jobs.create);
        bender.on('client:fetch', bender.jobs.fetch);
        bender.on('client:complete', bender.jobs.completeTask);

        done();
    }
};
