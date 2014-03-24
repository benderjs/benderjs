/**
 * @file Serves files from the file system
 */

var send = require('send');

/**
 * Create a HTTP Handler for requests for files from the file system
 * @return {Function}
 */
function create() {
    var pattern = /^\/(absolute|tests)/;

    return function (req, res, next) {
        var path;

        if (req.method !== 'GET' || !pattern.test(req.url)) return next();

        path = req.url.replace(pattern, '');
        send(req, path).pipe(res);
    };
}

module.exports.create = create;
