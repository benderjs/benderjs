/**
 * Files collection
 */
function Files() {
    this.files = [];
}

/**
 * Add a file to the collection
 * @param {String} file File path
 */
Files.prototype.add = function (file) {
    this.files.push(file);
};

/**
 * Check if file exists in the collection
 * @param  {String} file File path
 * @return {Boolean}
 */
Files.prototype.check = function (file) {
    return this.files.indexOf(file) > -1;
};

module.exports = Files;
