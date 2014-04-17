var logger = require('../logger');
    
module.exports = {

    name: 'dashboardReporter',

    attach: function () {
        var bender = this,
            reporter;

        bender.checkDeps(module.exports.name, 'sockets');

        reporter = {
            'browsers:change': function (browsers) {
                bender.sockets.dashboards.json.emit('browsers:update', browsers);
            },

            'tests:change': function (tests) {
                bender.sockets.dashboards.json.emit('tests:update', tests);
            },

            'jobs:change': function (jobs) {
                bender.sockets.dashboards.json.emit('jobs:update', jobs);
            }
        };

        bender.onAny(function () {
            if (typeof reporter[this.event] == 'function') {
                reporter[this.event].apply(bender, arguments);
            }
        });
    }
};
