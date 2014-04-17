var log = require('../logger');

module.exports = {

    name: 'consoleReporter',

    'client:run': function (tests) {
        log.info('Run tests:', tests);
    },

    'client:result': function (data) {
        log.info((data.result.success ? 'PASSED' : 'FAILED'),
            data.result.name, 'on client', data.client);

        if (!data.result.success) log.info(data.result.errors);
    },

    'client:complete': function (id) {
        log.info('Client', id, 'testing completed');
    },

    'client:queue': function (tests) {
        log.info('Queue tests', tests);
    },

    'client:log': function (msg) {
        log.info('Test log:', msg);
    },

    'client:error': function (error) {
        log.error('Test error:', error);
    },

    'client:register': function (client) {
        log.info('Client connected:', client.id, client.ua);
    },

    'client:disconnect': function (id) {
        log.info('Client disconnected:', id);
    },

    'dashboard:register': function (id) {
        log.info('Dashboard connected:', id);
    },

    'dashboard:disconnect': function (id) {
        log.info('Dashboard disconnected:', id);
    }
};
