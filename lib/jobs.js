var path = require('path'),
    fs = require('fs'),
    ncp = require('ncp').ncp,
    when = require('when'),
    whenNode = require('when/node'),
    mkdir = whenNode.lift(fs.mkdir),
    whenCall = whenNode.call,
    Datastore = require('nedb'),
    _ = require('lodash'),

    cwd = process.cwd(),
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
            browserTasksDb = new Datastore({
                filename: path.join(cwd, '/.bender/browser_tasks.db'),
                autoload: true
            }),
            jobAppsDb = new Datastore({
                filename: path.join(cwd, '/.bender/job_apps.db'),
                autoload: true
            }),
            testsDb;

        bender.checkDeps(module.exports.name, 'tests', 'applications', 'utils');

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

            // prepare job directory structure
            function prepareDir(job) {
                id = job._id;
                dir = path.join(jobsDir, id);

                return mkdir(dir)
                    .then(function () {
                        return mkdir(path.join(dir, 'tests'));
                    })
                    .then(function () {
                        return mkdir(path.join(dir, 'apps'));
                    });
            }

            // prepare task object
            function prepareTask(task) {
                delete task._id;
                delete task.tags;

                task.jobId = id;

                return task;
            }

            // add tasks to the database
            function insertTasks(tests) {
                return whenCall(
                        tasksDb.insert.bind(tasksDb),
                        tests.map(prepareTask)
                    );
            }

            // copy tests and create tasks for them
            function fillTasksDb() {
                return whenCall(
                        testsDb.find.bind(testsDb), {
                        id: { $in: data.tests }
                    })
                    .then(insertTasks);
            }

            // add browser tasks to the database
            function fillBrowserTasksDb(tasks) {
                var pattern = /^([a-z]+)(\d*)/i;

                // add browser tasks for given task
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

                    return whenCall(
                        browserTasksDb.insert.bind(browserTasksDb),
                        browsers
                    );
                }

                return when
                    .map(tasks, insertTaskBrowsers)
                    .then(function () {
                        return tasks;
                    });
            }

            // takes a snapshot of current tests
            function copyTests(tasks) {
                var dest = path.join(jobsDir, id, 'tests'),
                    paths = tasks
                        .reduce(function (result, current) {
                            var dir = bender.conf.tests[current.group].basePath;

                            if (result.indexOf(dir) === -1) result.push(dir);

                            return result;
                        }, []);

                return when
                    .map(paths, function (dir) {
                        var rel = path.relative(cwd, dir);
                        
                        return whenCall(
                                bender.utils.mkdirp, path.join(dest, rel)
                            )
                            .then(function () {
                                return whenCall(ncp, dir, path.join(dest, rel));
                            });
                    })
                    .then(function () {
                        return tasks;
                    });
            }

            // takes a snapshot of applications required by selected tests
            function copyApps(tasks) {
                var apps = [];

                // copy application with given name
                function copyApp(name) {
                    var app = bender.applications.findOne('name', name),
                        dest = path.join(jobsDir, id, '/apps/' + app.url);

                    // add application details to the database
                    function addToDb() {
                        return whenCall(
                            jobAppsDb.insert.bind(jobAppsDb),
                            _.merge({ jobId: id }, app)
                        );
                    }
                    
                    // copy application directory
                    function copyFiles() {
                        return app.proxy ? when.resolve() : // ignore proxied apps
                            whenCall(ncp, path.join(cwd, app.path), dest)
                                .then(addToDb);
                    }

                    return mkdir(dest)
                        .then(copyFiles);
                }

                // build a list of applications to copy
                tasks.forEach(function (task) {
                    task.applications.forEach(function (app) {
                        if (apps.indexOf(app) === -1) apps.push(app);
                    });
                });
                
                return when.map(apps, copyApp);
            }

            return whenCall(jobsDb.insert.bind(jobsDb), job)
                .then(prepareDir)
                .then(fillTasksDb)
                .then(fillBrowserTasksDb)
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
         * Get task details for a given job
         * @param  {String} jobId  Id of a job
         * @param  {String} taskId Id of a task
         * @return {Promise}
         */
        jobs.getTask = function (jobId, taskId) {
            return whenCall(tasksDb.findOne.bind(tasksDb), {
                $and: [
                    { jobId: jobId },
                    { id: taskId }
                ]
            });
        };

        /**
         * Get application's details for a given job
         * @param  {String} jobId Id of a job
         * @param  {String} name  Application name
         * @return {Promise}
         */
        jobs.getApp = function (jobId, name) {
            return whenCall(jobAppsDb.findOne.bind(jobAppsDb), {
                $and: [
                    { jobId: jobId },
                    { name: name }
                ]
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

            // build given tasks
            function buildTasks(tasks) {
                var taskIds = tasks.map(function (task) {
                        return task._id;
                    });

                // build results for given tasks
                function buildResults(results) {
                    tasks.forEach(function (task, index) {
                        tasks[index] = {
                            id: task.id,
                            _id: task._id,
                            jobId: task.jobId,
                            results: results.filter(function (result) {
                                return result.taskId === task._id &&
                                    (delete result.taskId) && (delete result._id) &&
                                    (delete result.created);
                            })
                        };
                    });

                    data.forEach(function (job) {
                        job.tasks = tasks.filter(function (task) {
                            return task.jobId === job._id && delete task.jobId;
                        });
                    });

                    return data;
                }

                return whenCall(
                        browserTasksDb.find.bind(browserTasksDb), {
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

            // group results by browser name and version
            function groupResults(result) {
                var browserId = result.name + '_' + result.version,
                    res = results[browserId];

                if (!res) results[browserId] = res = result;

                if (result.status === jobs.STATUS.PENDING ||
                    (result.status === jobs.STATUS.FAILED &&
                    res.status !== jobs.STATUS.PENDING))
                    res.status = result.status;
            }

            job.tasks.forEach(function (task) {
                task.results.forEach(groupResults);
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
            // handle found task
            function handleBrowserTask(err, result) {
                if (err || !result) return;

                // update task status
                function updateTask(err, task) {
                    if (err || !task) return;

                    // run found task
                    function run(err, count) {
                        if (err || !count) return;

                        bender.emit('job:run', client.id, {
                            id: '/jobs/' + task.jobId + '/tests/' + task.id,
                            tbId: result._id
                        });
                    }

                    browserTasksDb.update(
                        { _id: result._id },
                        { $set: { status: 1 } },
                        run
                    );
                }

                tasksDb.findOne({ _id: result.taskId }, updateTask);
            }

            function handleTimedOut(err, result) {
                if (err) return;

                // take care of timed-out task first
                if (result) return handleBrowserTask(err, result);

                // find waiting task
                browserTasksDb
                    .findOne({
                        $and: [
                            { name: client.browser },
                            { status: 0 },
                            { version: { $in: [client.version, 0] } }
                        ]
                    })
                    .sort({ created: 1 })
                    .exec(handleBrowserTask);
            }

            // find unresolved in 5 minutes
            browserTasksDb
                .findOne({
                    $and: [
                        { status: 1 },
                        { created: {
                                $lt: (new Date() - 5 * 60 * 1000)
                            }
                        },
                        { name: client.browser },
                        { version: { $in: [client.version, 0] } }
                    ]
                })
                .sort({ created: 1 })
                .exec(handleTimedOut);
        };

        /**
         * Complete a browser task
         * @param {Object}  data Task data
         * @param {String}  data.tbId Task id
         * @param {Boolean} data.success Completed successfully
         */
        jobs.completeTask = function (data) {
            function getErrors() {
                if (data.success) return;

                return data.results.map(function (result) {
                        return '<strong>' + result.name + '</strong>:<br>' +
                            (result.errors ? result.errors.join('<br>') : 'unknown');
                    }).join('<br>');
            }

            browserTasksDb.update(
                { _id: data.tbId },
                {
                    $set: {
                        status: data.success ? 2 : 3,
                        errors: getErrors()
                    }
                },
                function () {} // nothing do to here...?
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
