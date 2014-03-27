/**
 * @file Handles default HTTP routes
 */

var fs = require('fs'),
    path = require('path'),
    uuid = require('node-uuid').v4;

/**
 * Create HTTP Handler for default routes
 * @param  {Object} tests Tests module
 * @return {Function}
 */
function create(bender) {
    var clientPattern = /^\/clients\/[\w]{8}(-[\w]{4}){3}-[\w]{12}$/,
        statics = path.resolve(__dirname, '../../static/'),
        views = {};

    /**
     * Render stored view
     * @param  {String}   name View name
     * @param  {Object}   res  HTTP response
     * @param  {Function} next Next callback
     */
    function render(name, res, next) {
        if (views[name]) {
            bender.utils.renderHTML(res, views[name]);
        } else {
            fs.readFile(path.join(statics, name + '.html'), function (err, data) {
                if (err) return next();

                views[name] = bender.utils.template(data.toString(), bender.constants);
                bender.utils.renderHTML(res, views[name]);
            });
        }
    }

    return function (req, res, next) {
        if (req.url === '/') {
            return render('index', res, next);
        }

        if (req.url === '/capture') {
            res.writeHead(302, { Location: '/clients/' + uuid() });
            return res.end();
        }

        if (clientPattern.test(req.url)) {
            return render('capture', res, next);
        }

        next();
    };
}

module.exports.create = create;
