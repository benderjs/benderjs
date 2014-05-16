/**
 * @file Cache a file in the file system
 */

var path = require('path'),
    fs = require('fs'),
    when = require('when'),
    whenNode = require('when/node'),
    rimraf = require('rimraf'),
    defaultCache = path.join(process.cwd(), '/.bender/cache/'),
    read = whenNode.lift(fs.readFile),
    write = whenNode.lift(fs.writeFile);

/**
 * File cache
 * @constructor
 */
function Cache() {
    this.dir = defaultCache;
    this.list = null;
}

/**
 * Initialize a cache
 * @return {Promise}
 */
Cache.prototype.init = function () {
    return whenNode
        .call(fs.readdir, this.dir)
        .then(
            function (list) {
                this.list = list;
            }.bind(this),
            function (err) {
                this.list = [];
                return whenNode.call(fs.mkdir, this.dir);
            }.bind(this)
        );
};

/**
 * Read a file from the cache
 * @param  {String} name file name
 * @return {Promise}
 */
Cache.prototype.read = function (name) {
    var path = this.getPath(name);

    if (!path) return when.reject(null);

    return read(path);
};

/**
 * Write data into a file
 * @param  {String} name File name
 * @param  {String} data Data to be written
 * @return {Promise}
 */
Cache.prototype.write = function (name, data) {
    name = this.parseName(name);

    return write(path.join(this.dir, name), data)
        .then(function () {
            this.list.push(name);
            return data;
        }.bind(this));
};

/**
 * Check if file exists within the cache
 * @param  {String} name File name
 * @return {Boolean}
 */
Cache.prototype.check = function (name) {
    name = this.parseName(name);

    return this.list.indexOf(name) !== -1;
};

/**
 * Return direct path to cached file
 * @param  {String} name File name
 * @return {String|Null}
 */
Cache.prototype.getPath = function (name) {
    return this.check(name) ?
        path.join(this.dir, this.parseName(name)) : null;
};

Cache.prototype.parseName = function (name) {
    return name.split('/').join('_').replace(/([\?\:\*\|\.><])/g, '_') + '.html';
};

/**
 * Clear the cache
 * @return {Promise}
 */
Cache.prototype.clear = function () {
    return whenNode
        .call(rimraf, this.dir)
        .then(function () {
            this.init();
        }.bind(this));
};

module.exports = {

    name: 'cache',

    attach: function () {
        this.cache = new Cache();
    },

    init: function (done) {
        this.cache
            .clear() // todo reaplace with init
            .done(done);
    }
};
