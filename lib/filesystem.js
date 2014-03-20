var send = require('send');

function create() {
    var pattern = /^\/absolute/;
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
