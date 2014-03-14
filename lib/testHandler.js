function TestHandler() {}

TestHandler.prototype.create = function () {
    var pattern = /^\/tests\/([\w-_\/]+(?:.js))$/;

    return function (req, res, next) {
        var match = pattern.exec(req.url),
            test;

        if (req.method === 'GET' && match && (test = this.getTest(match[1]))) {

            res.render('context.ejs', {
                name: test.id, // TODO retrieve from the test file
                html: test.getHtml(),
                scripts: this.getScripts(),
                css: test.getCss(),
                spec: test.getSpec()
            });
        } else {
            next();
        }
    }.bind(this);
};

TestHandler.prototype.getTest = function (id) {
    // TODO retrieve test data
};

TestHandler.prototype.getScripts = function () {
    // TODO return all resources which should be loaded
};

module.exports = new TestHandler();
