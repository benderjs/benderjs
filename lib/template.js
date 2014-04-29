var when = require('when'),
    pipeline = require('when/pipeline'),
    combine = require('dom-combiner');

module.exports = {
    name: 'template',

    attach: function () {
        var bender = this,
            template = bender.template = {};

        bender.checkDeps(module.exports.name, 'pagebuilders');

        function prepareTest(test) {
            test.applications = bender.applications.get(test.applications);
            test.assertion = bender.assertions[test.assertion];

            return when.resolve(test);
        }

        function prepareTask(task) {
            function toJob(file) {
                return '/jobs/' + task.jobId + file;
            }

            function getApp(name) {
                function handleApp(app) {
                    if (!app) return bender.applications.get(name) || null;

                    // map app urls to job directory
                    return {
                        js: app.js.map(toJob),
                        css: app.css.map(toJob)
                    };
                }

                return bender.jobs
                    .getApp(task.jobId, name)
                    .then(handleApp);
            }

            return when
                .map(task.applications, getApp)
                .then(function (apps) {
                    task.applications = apps;
                    task.assertion = bender.assertions[task.assertion];

                    return task;
                });
        }

        template.build = function (data) {
            function prepareData(data) {
                data.parts = [];

                return pipeline(bender.pagebuilders, data)
                    .then(function (result) {
                        return when
                            .all(result.parts)
                            .then(combine);
                    });
            }

            return (data.jobId ? prepareTask(data) : prepareTest(data))
                .then(prepareData);
        };
    }
};
