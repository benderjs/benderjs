var log = require('../logger');

module.exports = {

    name: 'bender-reporter-console',

    'client:run': function (tests) {
        log.info('Run tests:', tests);
    },

    'client:complete': function (data) {
        log.info('Client', data.client, 'testing complete');
        log.info(data.id, data.success ? 'PASSED' : 'FAILED');

        if (!data.success) {
            data.results.forEach(function (result) {
                if (result.success) return;

                log.error(result.name, 'FAILED\n' + result.errors.join('\n'));
            });
        }
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
