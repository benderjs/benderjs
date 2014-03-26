/**
 * @file Constants used across the application
 */

var pkg = JSON.parse(require('fs').readFileSync(__dirname + '/../package.json').toString());

module.exports = constants = {

    name: 'constants',

    VERSION: pkg.version,
    PORT: 1030,
    HOSTNAME: 'localhost',

    attach: function () {
        this.constants = constants;
    }
};
