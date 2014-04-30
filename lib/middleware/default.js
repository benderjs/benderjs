/**
 * @file Handles default HTTP routes
 */

var path = require('path'),
    send = require('send'),
    uuid = require('node-uuid').v4,
    logger = require('../logger');

/**
 * Create HTTP Handler for default routes
 * @return {Function}
 */
function create() {
    var clientPattern = /^\/clients\/[\w]{8}(-[\w]{4}){3}-[\w]{12}$/,
        statics = path.resolve(__dirname, '../../static/');

    return function (req, res, next) {
        function resume(err) {
            if (err && err.code !== 'ENOENT') logger.error(err);
            next();
        }

        // serve dashboard page
        if (req.url === '/') {
            return send(req, 'index.html')
                .root(statics)
                .on('error', resume)
                .pipe(res);
        }

        // redirect to capture page
        if (req.url === '/capture') {
            res.writeHead(302, { Location: '/clients/' + uuid() });
            return res.end();
        }

        // serve capture page
        if (clientPattern.test(req.url)) {
            return send(req, 'capture.html')
                .root(statics)
                .on('error', resume)
                .pipe(res);
        }

        next();
    };
}

module.exports = {
    name: 'bender-middleware-default',
    create: create
};
