var fs = require('fs'),
    path = require('path');

module.exports = {
    name: 'builders',

    attach: function () {
        var bender = this;

        bender.builders = [];

        // include default builders
        fs.readdirSync(__dirname).forEach(function (file) {
            if (file === 'index.js') return;

            bender.use(require(path.join(__dirname, file)));
        });
    },

    init: function (done) {
        done();
    }
};
