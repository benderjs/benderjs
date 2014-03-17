var _ = require('lodash');

function Test(id, src, html, meta) {
    this.id = id;
    this.src = src;
    this.spec = ''; // TODO cache spec content here ?
    this.html = html; // TODO cache html content here ?
    this.meta = meta;
}

Test.prototype.getHtml = function () {
    // TODO read and cache test template
    return this.html;
};

Test.prototype.getSpec = function (debug) {
    return debug ? this.src : this.spec;
};


function TestHandler() {
    this.tests = [];
}

TestHandler.prototype.add = function (data) {
    this.tests.push(new Test(data));
};

TestHandler.prototype.get = function (id) {
    if (_.isString(id)) return _.where(this.tests, { id: id })[0] || null;

    if (_.isArray(id)) {
        return this.tests.filter(function (test) {
            return ids.indexOf(test.id) > -1;
        });
    }

    return null;
};

TestHandler.prototype.list = function () {
    return this.tests.map(function (test) {
        return {
            id: test.id,
            name: test.name,
            meta: test.meta
        };
    });
};

module.exports = new TestHandler();
