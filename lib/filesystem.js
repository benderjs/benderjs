var send = require('send');

/**
 * Create a HTTP Handler for requests for files with absolute paths
 * @return {Function}
 */
function create() {
    var pattern = /^\/(absolute|tests)/;

    return function (req, res, next) {
        var path;

        if (pattern.test(req.url)) {
            path = req.url.replace(pattern, '');
            send(req, path).pipe(res);
        } else {
            next();
        }
    };
}

module.exports.create = create;
