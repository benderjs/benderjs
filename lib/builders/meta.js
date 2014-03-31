var whenNode = require('when/node'),
    whenKeys = require('when/keys'),
    fs = require('fs'),
    _ = require('lodash'),
    pattern = /\/\* bender\-tags\:([\w\, ]+)([^*]|[\r\n])*\*\//i;

/**
 * Find bender-tags comment and return matched tags
 * @param  {Buffer} data File buffer
 * @return {Array.<String>}
 */
function parseMeta(data) {
    var match = pattern.exec(data.toString());

    return match ? match[1].replace(/\s/g, '').split(',') : [];
}

/**
 * Add meta tags to tests in given group
 * @param  {Object} data Group object
 * @return {Promise}
 */
function build(data) {
    var files = {};

    // add tags to tests in given group object 
    function addTags(result) {
        _.forOwn(result, function (tags, name) {
            data.tests[name].tags = tags;
        });

        return data;
    }

    // create promise for given test
    function makePromise(test, name) {
        files[name] = whenNode
            .call(fs.readFile, test.js)
            .then(parseMeta);
    }

    _.forOwn(data.tests, makePromise);

    return whenKeys
        .all(files)
        .then(addTags);
}

module.exports = {

    name: 'bender-builder-meta',

    attach: function () {
        var bender = this;

        if (!bender.builders) {
            console.error('Meta data builder module requires: builders');
            process.exit(1);
        }

        bender.builders.push(build);
    }
};
