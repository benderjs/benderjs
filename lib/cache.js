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
    this.clear(); // TODO replace it with init later
    // this.init();
}

/**
 * Initialize a cache
 * @return {Promise}
 */
Cache.prototype.init = function () {
    if (fs.existsSync(this.dir) && fs.statSync(this.dir).isDirectory()) {
        this.list = fs.readdirSync(this.dir);
    } else {
        this.list = [];
        fs.mkdirSync(this.dir);
    }
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
    name = name.split(path.sep).join('_') + '.html';

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
    name = name.split(path.sep).join('_') + '.html';

    return this.list.indexOf(name) !== -1;
};

/**
 * Return direct path to cached file
 * @param  {String} name File name
 * @return {String|Null}
 */
Cache.prototype.getPath = function (name) {
    return this.check(name) ?
        path.join(this.dir, name.split(path.sep).join('_') + '.html') : null;
};

/**
 * Clear the cache
 * @return {Promise}
 */
Cache.prototype.clear = function () {
    // TODO yeah, we have to figure out how to use it asynchronously
    rimraf.sync(this.dir);
    this.init();
};

module.exports = {

    name: 'cache',

    attach: function () {
        this.cache = new Cache();
    }
};
