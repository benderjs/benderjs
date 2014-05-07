/**
 * @file Serves job assets
 */

var path = require('path'),
    send = require('send'),
    logger = require('../logger');

function create(bender) {
    return function (req, res, next) {
        var url = req.url.substr(1).split('/');

        if (url[0] !== 'jobs') return next();
        
        function resume(err) {
            if (err && err.code !== 'ENOENT') logger.error(err);
            next();
        }

        function sendFile() {
            send(req, path.join(process.cwd(), '.bender/', url.join('/')))
                .on('error', resume)
                .pipe(res);
        }

        function serveJob(job) {
            var file, ext;

            // no such job - leave
            if (!job) return resume();

            // only job id specified - render job in JSON
            if (!url[2]) return bender.utils.renderJSON(res, job);

            // request for a test (task) or its asset
            if (url[2] === 'tests') {
                file = url.slice(3).join('/');

                bender.jobs
                    .getTask(
                        url[1],
                        (ext = path.extname(file)) ? file.replace(ext, '') : file
                    )
                    .done(function (task) {
                        // no such task - try to send a file from jobs directory
                        if (!task) return sendFile();
                        
                        // server from the cache
                        if ((file = bender.cache.getPath(job.id + '/' + task.id))) {
                            send(req, file).on('error', resume).pipe(res);
                        // write to the cache and render
                        } else {
                            bender.template
                                .build(task)
                                .then(function (data) {
                                    return bender.cache.write(job.id + '/' + task.id, data);
                                })
                                .done(function (content) {
                                    bender.utils.renderHTML(res, content);
                                }, resume);
                        }
                    }, resume);
            // send a file from jobs directory
            } else {
                sendFile();
            }
        }

        if (req.method === 'GET') {
            // serve list of all jobs in JSON
            if (!url[1]) {
                return bender.jobs
                    .list()
                    .done(function (jobs) {
                        bender.utils.renderJSON(res, {
                            job: jobs
                        });
                    }, resume);
            }

            bender.jobs
                .get(url[1])
                .done(serveJob, resume);
        } else if (req.method === 'POST') {
            // create new job
            bender.jobs
                .create(req.body)
                .done(function (id) {
                    bender.utils.renderJSON(res, {
                        id: id
                    });
                }, resume);
        } else {
            next();
        }
    };
}

module.exports = {
    name: 'bender-middleware-jobs',
    create: create
};
