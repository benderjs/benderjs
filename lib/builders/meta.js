var path = require('path'),
    _ = require('lodash');

function build(data) {
    // TODO extract medatada from .js file and add tags if found any

    return data;
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
