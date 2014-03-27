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
    if (typeof file == 'string') {
        this.files.push(file);
    } else if(Array.isArray(file)) {
        this.files = this.files.concat(file);
    }
};

/**
 * Check if file exists in the collection
 * @param  {String} file File path
 * @return {Boolean}
 */
Files.prototype.check = function (file) {
    return this.files.indexOf(file) > -1;
};

module.exports = {

    name: 'files',

    attach: function () {
        this.files = new Files();
    }
};
