var util = require('util'),
    path = require('path'),
    fs = require('fs'),
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
            db;

        bender.checkDeps(module.exports.name, 'tests', 'cache');

        // yeah, that probably could be async...
        if (!fs.existsSync(jobsDir)) fs.mkdirSync(jobsDir);

        jobs.db = db = new Datastore({
            filename: path.join(process.cwd(), '.bender/jobs.db'),
            autoload: true
        });

        jobs.STATUS = {
            WAITING: 0,
            PENDING: 1,
            COMPLETE: 2
        };

        jobs.create = function (data, complete) {
            var job = {
                    status: jobs.STATUS.WAITING,
                    browsers: data.browsers,
                    description: data.description,
                    tests: data.tests
                },
                browserStates = data.browsers.reduce(function (result, current) {
                    result[current] = 0;
                    return result;
                }, {}),
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

            function prepareDBItem(item) {
                delete item._id;

                item.status = browserStates;

                return item;
            }

            function prepareDB() {
                var testDB = new Datastore({
                        filename: path.join(dir, '/tests.db'),
                        autoload: true
                    });

                return whenNode
                    .call(
                        bender.tests.db.find.bind(bender.tests.db),
                        { id: { $in: data.tests } }
                    ).then(function (items) {
                        return whenNode.call(
                                testDB.insert.bind(testDB),
                                items.map(prepareDBItem)
                            );
                    });
            }

            whenNode
                .call(db.insert.bind(db), job)
                .then(prepareDir)
                .then(prepareDB)
                .done(function () {
                    complete(id);

                    jobs.list()
                        .done(function (jobs) {
                            bender.emit('jobs:change', jobs);
                        });
                });
        };

        jobs.list = function () {
            return whenNode.call(db.find.bind(db), {});
        };
    },

    init: function (done) {
        var bender = this;

        bender.on('job:create', bender.jobs.create);

        done();
    }
};
