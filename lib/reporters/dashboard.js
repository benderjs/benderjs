var logger = require('../logger');
    
module.exports = {

    name: 'dashboardReporter',

    attach: function () {
        var bender = this,
            reporter;

        if (!bender.sockets) {
            log.error('Dashboard reporter module requires: sockets');
            process.exit(1);
        }

        reporter = {
            'test:run': function (tests) {
                bender.sockets.dashboards.json.emit('run', tests);
            },

            'test:result': function (data) {
                bender.sockets.dashboards.json.emit('result', data);
            },

            'test:complete': function (data) {
                bender.sockets.dashboards.json.emit('complete', data);
            },

            'test:queue': function (tests) {
                bender.sockets.dashboards.json.emit('queue', tests);
            },

            'clients:change': function (clients) {
                bender.sockets.dashboards.json.emit('clients:list', clients);
            },

            'tests:change': function (tests) {
                bender.sockets.dashboards.json.emit('tests:list', tests);
            }
        };

        bender.onAny(function () {
            if (typeof reporter[this.event] == 'function') {
                reporter[this.event].apply(bender, arguments);
            }
        });
    }
};
