var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    when = require('when'),
    whenNode = require('when/node'),
    mkdir = whenNode.lift(fs.mkdir),

    Datastore = require('nedb'),

    jobsDir = path.join(process.cwd(), '/.bender/jobs/'),

    log = require('./logger').create('jobs', true);


module.exports = {

    name: 'jobs',

    attach: function () {
        var bender = this,
            jobs = bender.jobs = {},
            jobsDb = new Datastore({
                filename: path.join(process.cwd(), '/.bender/jobs.db'),
                autoload: true
            }),
            tasksDb = new Datastore({
                filename: path.join(process.cwd(), '/.bender/tasks.db'),
                autoload: true
            }),
            taskBrowsersDb = new Datastore({
                filename: path.join(process.cwd(), '/.bender/task_browsers.db'),
                autoload: true
            }),
            testsDb;

        bender.checkDeps(module.exports.name, 'tests', 'cache');

        testsDb = bender.tests.db;

        // yeah, that probably could be async...
        if (!fs.existsSync(jobsDir)) fs.mkdirSync(jobsDir);

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

            function fillTasksDb() {
                function insertTasks(tests) {
                    return whenNode
                        .call(tasksDb.insert.bind(tasksDb), tests.map(prepareTask))
                        .then();
                }

                function prepareTask(task) {
                    delete task._id;
                    delete task.tags;
                    delete task.group;

                    task.jobId = id;
                    task.created = +new Date();

                    return task;
                }

                return whenNode
                    .call(testsDb.find.bind(testsDb),
                        { id: { $in: data.tests } })
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
                                version: match[2],
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

        jobs.fetch = function (id, socket) {
            // TODO
        };

        jobs.list = function () {

            // TODO move it to separate api
            function prepareJobs(jobs) {
                return when.map(jobs, function (job) {
                    return whenNode
                        .call(tasksDb.find.bind(tasksDb), { jobId: job._id })
                        .then(function (tasks) {
                            return when.map(tasks, function (task) {
                                return whenNode
                                    .call(
                                        taskBrowsersDb.find.bind(taskBrowsersDb),
                                        { taskId: task._id }
                                    )
                                    .then(function (browsers) {
                                        task.results = browsers;
                                        return task;
                                    });
                                });
                        })
                        .then(function (tasks) {
                            var results = [];

                            // TODO go through the tasks to build the results

                            job.results = results;
                            return job;
                        });
                    });
            }

            return whenNode
                .call(jobsDb.find.bind(jobsDb), {})
                .then(prepareJobs);
        };
    },

    init: function (done) {
        var bender = this;

        bender.on('job:create', bender.jobs.create);
        bender.on('client:fetch', bender.jobs.fetch);

        done();
    }
};
