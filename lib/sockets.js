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

        if (!bender.clients || !bender.tests) {
            logger.error('Sockets module requires: clients, tests');
            process.exit(1);
        }

        /**
         * Queue of test IDs to run
         * @type {Array}
         */
        sockets.queue = [];

        /**
         * Handle dashboard sockets
         * @param  {Object} socket Web Socket object
         */
        function handleDashboard(socket) {
            // dashboard registered
            socket.on('register', function () {
                bender.emit('dashboard:register', socket.id);
            });

            // dashboard wants to run some tests
            socket.on('run', function (ids) {
                if (bender.clients.checkReady()) {
                    bender.emit('test:run', ids);

                    sockets.clients.json.emit('run', bender.tests.get(ids));
                    sockets.dashboards.json.emit('run', bender.tests.get(ids));
                } else {
                    queue.push(ids);
                    bender.emit('test:queue', ids);
                }
            }.bind(this));

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
            // client connected
            socket.on('register', function (client) {
                socket.set('id', client.id);

                bender.emit('client:register', {
                    id: client.id,
                    ua: client.ua
                });
            });

            // result of a test
            socket.on('result', function (suite, result) {
                bender.emit('test:result', {
                    client: socket.get('id'),
                    suite: suite,
                    result: result
                });
            });

            // testing completed
            socket.on('complete', function (result) {
                bender.emit('test:complete', {
                    client: socket.get('id'),
                    result: result,
                    socket: socket
                });

                if (bender.clients.checkReady()) {
                    sockets.clients.json.emit('run', bender.tests.get(queue.shift()));
                }
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
            
            // socket namespace for clients (browsers)
            sockets.clients = io.of('/client');
            sockets.clients.on('connection', handleClient);

            // emit updated client list when client list changes
            bender.on('clients:change', function (clients) {
                sockets.dashboards.emit('client:list', clients);
            }.bind(this));
        };
    }
};
