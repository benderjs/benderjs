var fs = require('fs'),
    whenNode = require('when/node'),
    logger = require('../logger'),
    singlePath = require('path').join(__dirname, '../../static/single.html'),
    single;

function create(bender) {

    return function (req, res, next) {
        var url = req.url.substr(1).split('/');

        if (req.method !== 'GET' || url[0] !== 'single') return next();

        url[0] = '/tests';

        function render() {
            bender.utils.renderHTML(res, bender.utils.template(single, {
                test: url.join('/')
            }));
        }

        if (single) return render();

        whenNode
            .call(fs.readFile, singlePath)
            .done(function (data) {
                single = data.toString();
                render();
            }, function (err) {
                logger.error(err);
                next();
            });
    };
}

module.exports.create = create;
