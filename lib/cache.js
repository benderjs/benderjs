/**
 * @file Cache a file in the file system
 */

var path = require('path'),
    fs = require('fs'),
    when = require('when/node'),
    rimraf = require('rimraf'),
    defaultCache = path.join(process.cwd(), '/.bender/cache/'),
    mkdir = when.lift(fs.mkdir),
    readDir = when.lift(fs.readdir),
    read = when.lift(fs.readFile),
    write = when.lift(fs.writeFile),
    rmrf = when.lift(rimraf);

/**
 * File cache
 * @constructor
 */
function Cache(path) {
    this.dir = path || defaultCache;
    this.list = null;
}

/**
 * Initialize a cache
 * @return {Promise}
 */
Cache.prototype.init = function () {
    if (fs.existsSync(this.dir) && fs.statSync(this.dir).isDirectory()) {
        return readDir(this.dir).then(function (list) {
                this.list = list;
            }.bind(this));
    } else {
        this.list = [];
        return mkdir(this.dir);
    }
};

/**
 * Read a file from the cache
 * @param  {String} name file name
 * @return {Promise}
 */
Cache.prototype.read = function (name) {
    name = name.split(path.sep).join('_');

    if (this.list.indexOf(name) === -1) return when.reject(null);

    return read(path.join(this.dir, name));
};

/**
 * Write data into a file
 * @param  {String} name File name
 * @param  {String} data Data to be written
 * @return {Promise}
 */
Cache.prototype.write = function (name, data) {
    name = name.split(path.sep).join('_');

    return write(path.join(this.dir, name), data)
        .then(function () {
            this.list.push(name);
        }.bind(this));
};

/**
 * Clear the cache
 * @return {Promise}
 */
Cache.prototype.clear = function () {
    return rmrf(this.dir)
        .then(function () {
            return this.init();
        }.bind(this));
};

module.exports = Cache;
