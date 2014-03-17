var tests = require('./tests'),
    applicationHandler = require('./applicationHandler');

function TestHandler() {}

TestHandler.prototype.create = function () {
    var pattern = /^\/tests\/([\w-_\/]+)(?:.js)$/;

    return function (req, res, next) {
        var match = pattern.exec(req.url),
            test;

        if (req.method === 'GET' && match && (test = tests.get(match[1]))) {
            res.render('context.ejs', {
                quirks: false, // TODO how to set it properly?
                debug: false,
                app: applicationHandler.get('myApp'), // TODO where to get app name(s)?!
                plugins: this.getPlugins(),
                scripts: this.getScripts(),
                id: test.id,
                html: test.getHtml(),
                spec: test.getSpec(debug)
            });
        } else {
            next();
        }
    }.bind(this);
};

TestHandler.prototype.getScripts = function () {
    // TODO return resources which should be loaded in the test context
    return [];
};

TestHandler.prototype.getPlugins = function () {
    // TODO return all plugins which should be loaded in the test context
    return [];
};

module.exports = new TestHandler();
