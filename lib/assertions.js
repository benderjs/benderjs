/**
 * @file Manages assertions
 */

/**
 * Assertion
 * @param {Array.<String>} files Array of files required by assertion library
 */
function Assertion(files) {
    this.js = [];
    this.css = [];

    this.build(files);
}

/**
 * Build file arrays needed layer for test context build
 * @param  {Array.<String>} files Array of files required by the assertion library
 * @private
 */
Assertion.prototype.build = function (files) {
    var pattern = /\.(css|js)$/;

    files.forEach(function (file) {
        var ext = pattern.exec(file);

        if (ext) this[ext[1]].push('/plugins' + file);
    }.bind(this));
};



/**
 * Collection of assertions
 * @param {Object} files File collection
 */
function AssertionCollection(bender) {
    this.assertions = {};
    this.hosted = bender.files;
}

/**
 * Add new assertion to the collection
 * @param {String} name    Assertion plugin name
 * @param {Object} options Plugin configuration object
 */
AssertionCollection.prototype.add = function (name, options) {
    this.assertions[name] = new Assertion(options.files.map(function (file) {
        this.hosted.add(file);
        return file;
    }.bind(this)));
};

/**
 * Get assertion by name
 * @param  {String} name Assertion name
 * @return {Assertion|Object}
 */
AssertionCollection.prototype.get = function (name) {
    return this.assertions[name.toLowerCase()] || null;
};

module.exports = {

    name: 'assertions',

    attach: function () {
        var bender = this;

        bender.assertions = new AssertionCollection(bender);
    }
};
