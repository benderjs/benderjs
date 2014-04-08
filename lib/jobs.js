var util = require('util'),
    Collection = require('./collection');

function Jobs() {
    Collection.call(this);
}

util.inherits(Jobs, Collection);

// TODO

module.exports = {

    name: 'jobs',

    attach: function () {
        var bender = this;

        bender.jobs = new Jobs();
    },

    init: function (done) {
        var bender = this;

        done();
    }
};
