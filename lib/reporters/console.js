var log = require('../logger');

module.exports = {

    name: 'consoleReporter',

    'test:run': function (tests) {
        log.info('Run tests:', tests);
    },

    'test:result': function (data) {
        log.info((data.result.success ? 'PASSED' : 'FAILED'), 'Test', data.suite + '/' + data.result.name, 'on client', data.client);
        if (!data.result.success) {
            log.info(data.result.errors);
        }
    },

    'test:complete': function (data) {
        log.info('Client', data.client, 'testing completed');
    },

    'test:queue': function (tests) {
        log.info('Queue tests', tests);
    },

    'test:log': function (msg) {
        log.info('Test log:', msg);
    },

    'test:error': function (error) {
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
