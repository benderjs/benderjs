var uuid = require('node-uuid').v4;

/**
 * Create HTTP Handler for default routes
 * @param  {Object} tests Tests module
 * @return {Function}
 */
function create(tests) {
    var clientPattern = /^\/clients\/[\w]{8}(-[\w]{4}){3}-[\w]{12}$/;

    return function (req, res, next) {
        if (req.url === '/') {
            return res.render('index.ejs', {
                groups: tests.list()
            });
        }

        if (req.url === '/capture') {
            res.writeHead(302, {
                Location: '/clients/' + uuid()
            });

            return res.end();
        }

        if (clientPattern.test(req.url)) {
            return res.render('capture.ejs');
        }

        next();
    };
}

module.exports.create = create;
