/**
 * @file Serves files from the file system
 */

var send = require('send'),
    logger = require('../logger');

/**
 * Create a HTTP Handler serving files from the file system
 * @return {Function}
 */
function create(bender) {
    var pattern = /^\/(plugins)\//;

    return function (req, res, next) {
        var path;

        function resume(err) {
            if (err && err.code !== 'ENOENT') logger.error(err);
            next();
        }

        if (req.method !== 'GET' || !pattern.test(req.url)) return next();

        path = req.url.replace(pattern, '');

        // do not serve files that weren't meant to
        if (!bender.plugins.checkFile(path)) return next();

        send(req, path)
            .on('error', resume)
            .pipe(res);
    };
}

module.exports = {
    name: 'bender-middleware-plugins',
    create: create
};

