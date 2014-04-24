/**
 * @file Serves job assets
 */

var logger = require('../logger');

function create(bender) {

    return function (req, res, next) {
        var url = req.url.substr(1).split('/'),
            id;

        function resume(err) {
            if (err) logger.error(err);
            next();
        }
        
        if (url[0] !== 'jobs') return next();

        if (req.method === 'GET') {
            id = url.slice(1).join('/');

            // serve list of all jobs
            if (!id) {
                return bender.jobs
                    .list()
                    .done(function (jobs) {
                        bender.utils.renderJSON(res, jobs);
                    }, resume);
            }

            bender.jobs
                .get(id)
                .done(function (job) {
                    if (job) return bender.utils.renderJSON(res, job);

                    // TODO serve job files/job details
                }, resume);
        }

        if (req.method === 'POST') {
            bender.jobs
                .create(req.body)
                .done(function (id) {
                    bender.utils.renderJSON(res, {
                        id: id
                    });
                }, resume);
        }
    };
}

module.exports.create = create;
