/**
 * @file Cache a file stiring it in the filesystem
 */

var path = require('path'),
    fs = require('fs'),
    when = require('when/node'),
    rimraf = require('rimraf'),
    dir = path.join(process.cwd(), '/.bender/cache/'),
    mkdir = when.lift(fs.mkdir),
    readDir = when.lift(fs.readdir),
    read = when.lift(fs.readFile),
    write = when.lift(fs.writeFile),
    rmrf = when.lift(rimraf);

/**
 * File cache
 * @constructor
 */
function Cache() {
    this.list = [];
}

/**
 * Initialize a cache
 * @return {Promise}
 */
Cache.prototype.init = function () {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return readDir(dir).then(function (list) {
                this.list = list;
            }.bind(this));
    } else {
        return mkdir(dir);
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

    return read(path.join(dir, name));
};

/**
 * Write data into a file
 * @param  {String} name File name
 * @param  {String} data Data to be written
 * @return {Promise}
 */
Cache.prototype.write = function (name, data) {
    name = name.split(path.sep).join('_');

    return write(path.join(dir, name), data)
        .then(function () {
            this.list.push(name);
        }.bind(this));
};

/**
 * Clear the cache
 * @return {Promise}
 */
Cache.prototype.clear = function () {
    return rmrf(dir)
        .then(function () {
            this.list = [];
            return this.init();
        }.bind(this));
};

module.exports = Cache;
