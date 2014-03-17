var tests = require('./tests');

function TestHandler() {}

TestHandler.prototype.create = function () {
    var pattern = /^\/tests\/([\w-_\/]+)(?:.js)$/;

    return function (req, res, next) {
        var match = pattern.exec(req.url),
            test;

        if (req.method === 'GET' && match && (test = tests.getTest(match[1]))) {
            res.render('context.ejs', {
                quirks: false, // TODO how to set it properly?
                app: this.getApp(),
                scripts: this.getScripts(),
                id: test.id, // TODO retrieve from the test file
                html: test.getHtml(),
                spec: test.getSpec()
            });
        } else {
            next();
        }
    }.bind(this);
};

TestHandler.prototype.getApp = function () {
    return {};
};

TestHandler.prototype.getScripts = function () {
    // TODO return all resources which should be loaded
};

module.exports = new TestHandler();
