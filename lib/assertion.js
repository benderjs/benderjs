function Assertion(files) {
    this.js = [];
    this.css = [];

    this.build(files);
}

Assertion.prototype.build = function (files) {
    var pattern = /\.(css|js)$/;

    files.forEach(function (file) {
        var ext = pattern.exec(file);

        if (ext) this[ext[1]].push(file);
    }.bind(this));
};

function AssertionCollection() {
    this.assertions = {};
}

AssertionCollection.prototype.add = function (name, options) {
    this.assertions[name.split('-')[1]] = new Assertion(options.files);
};

AssertionCollection.prototype.get = function (name) {
    return this.assertions[name.toLowerCase()] || {};
};

module.exports = AssertionCollection;
