/**
 * @file Builds test context, serves test assets
 */

var path = require('path'),
    send = require('send'),
    logger = require('../logger');

/**
 * Create a HTTP handler that servers test context and files
 * @return {Function}
 */
function create(bender) {
    /**
     * Build test context for the given test
     * @param  {Test}   test Test object
     * @return {String}
     */
    function build(test) {
        var data = {
                html: test.html,
                js: test.js
            };

        data.head = [].concat(
            bender.applications.get(test.applications),
            bender.plugins.get('assertion', test.assertion)
        );

        return bender.template.build(data);
    }

    return function (req, res, next) {
        var url = req.url.substr(1).split('/'),
            file,
            ext;

        function resume(err) {
            if (err) logger.error(err);
            next();
        }

        if (req.method !== 'GET' || url[0] !== 'tests') return next();
        
        file = url.slice(1).join('/');

        // serve list of all tests
        if (!file) {
            return bender.tests
                .list()
                .done(function (data) {
                    bender.utils.renderJSON(res, {
                        test: data
                    });
                }, resume);
        }

        bender.tests
            .get(decodeURIComponent((ext = path.extname(file)) ? file.replace(ext, '') : file))
            .done(function (test) {
                // host assets from a test directory
                if (!test) return send(req, file).on('error', resume).pipe(res);
                
                // server from the cache
                if ((file = bender.cache.getPath(test.id))) {
                    send(req, file).on('error', resume).pipe(res);
                // write to the cache and render
                } else {
                    build(test)
                        .then(function (data) {
                            return bender.cache.write(test.id, data);
                        })
                        .done(function (content) {
                            bender.utils.renderHTML(res, content);
                        }, resume);
                }
            }, resume);
    };
}

module.exports.create = create;
