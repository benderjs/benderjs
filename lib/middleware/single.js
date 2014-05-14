var fs = require('fs'),
    combine = require('dom-combiner'),
    call = require('when/node').call,
    logger = require('../logger'),
    singlePath = require('path').join(__dirname, '../../static/single.html'),
    singleTemplate;

function create(bender) {

    return function (req, res, next) {
        var url = req.url.substr(1).split('/');

        if (req.method !== 'GET' || url[0] !== 'single') return next();

        function render() {
            bender.tests.get(url.slice(1).join('/'))
                .done(function (test) {
                    if (!test) return next();

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
