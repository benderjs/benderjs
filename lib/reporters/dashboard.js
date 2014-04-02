var logger = require('../logger');
    
module.exports = {

    name: 'dashboardReporter',

    attach: function () {
        var bender = this,
            reporter;

        bender.checkDeps(module.exports.name, 'sockets');

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

            'test:update': function (data) {
                bender.sockets.dashboards.json.emit('test:update', data);
            },

            'clients:change': function (clients) {
                bender.sockets.dashboards.json.emit('clients:update', clients);
            },

            'tests:change': function (tests) {
                bender.sockets.dashboards.json.emit('tests:update', tests);
            }
        };

        bender.onAny(function () {
            if (typeof reporter[this.event] == 'function') {
                reporter[this.event].apply(bender, arguments);
            }
        });
    }
};
