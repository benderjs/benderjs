/**
 * @file Web Socket class
 */

var sIO = require('socket.io'),
    logger = require('./logger'),
    log = logger.create('socket-io', { console: { level: 'info' } }, true);

module.exports = {

    name: 'sockets',

    attach: function () {
        var bender = this,
            sockets = bender.sockets = {};

        bender.checkDeps(module.exports.name, 'browsers', 'tests', 'jobs');

        /**
         * Handle dashboard sockets
         * @param  {Object} socket Web Socket object
         */
        function handleDashboard(socket) {
            // dashboard registered
            socket.on('register', function () {
                bender.emit('dashboard:register', socket.id);
                socket.emit('browsers:update', bender.browsers.get());
                bender.tests.list()
                    .done(function (tests) {
                        socket.emit('tests:update', tests);
                    });
                bender.jobs.list()
                    .done(function (jobs) {
                        socket.emit('jobs:update', jobs);
                    });
            });

            socket.on('job:create', function (job, confirm) {
                bender.emit('job:create', job, confirm);
            });

            // dashboard disconnected
            socket.on('disconnect', function () {
                bender.emit('dashboard:disconnect', socket.id);
            });
        }
        
        /**
         * Handle client sockets
         * @param  {Object} socket Web Socket object
         */
        function handleClient(socket) {
            var addr = socket.handshake.address;
            // client connected
            socket.on('register', function (client) {
                socket.set('id', client.id);

                bender.emit('client:register', {
                    id: client.id,
                    ua: client.ua,
                    addr: addr.address + ':' + addr.port
                });

                // TODO check job queue for tasks for this browser?
                // if (queue for this browser) socket.emit('run', test.id);
                // browser set ready = false
            });

            // result of a single test
            socket.on('result', function (data) {
                socket.get('id', function (err, id) {
                    if (err) return;

                    bender.emit('test:result', {
                        client: id,
                        id: data.id,
                        result: data.result
                    });
                });
            });

            // testing complete
            socket.on('complete', function (data) {
                socket.get('id', function (err, id) {
                    if (err) return;

                    bender.emit('test:complete', {
                        client: id,
                        results: data.results,
                        suite: data.suite
                    });

                    // TODO check for queued tests
                    // if (queue for this browser) socket.emit('run', test.id);
                    // browser set ready = false
                });
            });

            // error during testing
            socket.on('error', function (error) {
                bender.emit('test:error', error);
            });

            // captured test log
            socket.on('log', function (msg) {
                bender.emit('test:log', msg);
            });

            // client disconnected
            socket.on('disconnect', function () {
                socket.get('id', function (err, id) {
                    if (err) return;

                    bender.emit('client:disconnect', id);
                });
            });
        }

        /**
         * Attach Web Sockets to existing HTTP Server
         * @param  {Object} server HTTP Server
         */
        sockets.attach = function (server) {
            var io = sIO.listen(server, { logger: log });

            // socket namespace for dashboard
            sockets.dashboards = io.of('/dashboard');
            sockets.dashboards.on('connection', handleDashboard);
            
            // socket namespace for browsers (browsers)
            sockets.browsers = io.of('/client');
            sockets.browsers.on('connection', handleClient);
        };
    }
};
