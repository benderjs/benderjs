var log = require('../logger');

module.exports = {

    name: 'consoleReporter',

    'test:run': function (tests) {
        log.info('Run tests:', tests);
    },

    'test:result': function (data) {
        log.info('Test result:', data);
    },

    'test:complete': function (data) {
        log.info('Test complete:', data);
    },

    'test:queue': function (tests) {
        log.info('Queue tests:', tests);
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
