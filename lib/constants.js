/**
 * @file Constants used across the application
 */

var pkg = JSON.parse(require('fs').readFileSync(__dirname + '/../package.json').toString());

var constants = module.exports = {

    name: 'constants',

    VERSION: pkg.version,
    PORT: 1030,
    HOSTNAME: 'localhost',

    attach: function () {
        var bender = this;

        Object.keys(constants).forEach(function (name) {
            if (name === 'name' || name === 'attach') return;

            bender[name] = constants[name];
        });
    }
};
