/**
 * @file Handle single test mode requests
 */

var fs = require('fs'),
    combine = require('dom-combiner'),
    send = require('send'),
    call = require('when/node').call,
    logger = require('../logger'),
    singlePath = require('path').join(__dirname, '../../static/single.html'),
    singleTemplate;

/**
 * Create a HTTP Handler handling requests for single test mode
 * @return {Function}
 */
function create(bender) {
    return function (req, res, next) {
        var url = req.url.substr(1).split('/');

        if (req.method !== 'GET' || url[0] !== 'single') return next();

        // render a test page using single test mode template
        function render() {
            var id = url.slice(1).join('/');

            bender.tests.get(url.slice(1).join('/'))
                .done(function (test) {
                    if (!test) return send(req, id.split('?')[0]).on('error', next).pipe(res);

                    bender.template.build(test)
                        .done(function (html) {
                            bender.utils.renderHTML(res, combine(singleTemplate, html));
                        }, function (err) {
                            logger.error(err);
                            next();
                        });
                });
        }

        if (singleTemplate) return render();

        call(fs.readFile, singlePath)
            .done(function (data) {
                singleTemplate = data.toString();
                render();
            }, function (err) {
                logger.error(err);
                next();
            });
    };
}

module.exports = {
    name: 'bender-middleware-single',
    create: create
};
