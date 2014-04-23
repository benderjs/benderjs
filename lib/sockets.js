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

        bender.checkDeps(module.exports.name, 'browsers');

        /**
         * Handle dashboard sockets
         * @param {Object} socket Web Socket object
         */
        function handleDashboard(socket) {
            // dashboard registered
            socket.on('register', function () {
                bender.emit('dashboard:register', socket.id);
                socket.emit('browsers:update', bender.browsers.get());
            });

            // dashboard disconnected
            socket.on('disconnect', function () {
                bender.emit('dashboard:disconnect', socket.id);
            });
        }
        
        /**
         * Handle client sockets
         * @param {Object} socket Web Socket object
         */
        function handleClient(socket) {
            var addr = socket.handshake.address;
            // client connected
            socket.on('register', function (client) {
                socket.set('id', client.id);

                sockets.clients[client.id] = socket;

                bender.emit('client:register', {
                    id: client.id,
                    ua: client.ua,
                    addr: addr.address + ':' + addr.port
                });
            });

            // result of a single test
            socket.on('result', function (data) {
                socket.get('id', function (err, id) {
                    if (err) return;

                    bender.emit('client:result', {
                        client: id,
                        result: data
                    });
                });
            });

            // client wants a test
            socket.on('fetch', function () {
                socket.get('id', function (err, id) {
                    var client;

                    if (err || !(client = bender.browsers.clients.find('id', id)[0])) return;

                    bender.emit('client:fetch', client);
                });
            });

            // testing complete
            socket.on('complete', function (data) {
                socket.get('id', function (err, id) {
                    if (err) return;

                    bender.browsers.setClientReady(id);
                    data.client = id;
                    bender.emit('client:complete', data);
                });
            });

            // error during testing
            socket.on('error', function (error) {
                bender.emit('client:error', error);
            });

            // captured test log
            socket.on('log', function (msg) {
                bender.emit('client:log', msg);
            });

            // client disconnected
            socket.on('disconnect', function () {
                socket.get('id', function (err, id) {
                    if (err) return;

                    delete sockets.clients[id];

                    bender.emit('client:disconnect', id);
                });
            });
        }

        /**
         * Attach Web Sockets to existing HTTP Server
         * @param {Object} server HTTP Server
         */
        sockets.attach = function (server) {
            var io = sIO.listen(server, { logger: log });

            // socket namespace for dashboard
            sockets.dashboards = io.of('/dashboard');
            sockets.dashboards.on('connection', handleDashboard);
            
            // socket namespace for clients (browsers)
            sockets.browsers = io.of('/client');
            sockets.browsers.on('connection', handleClient);

            sockets.clients = {};
        };

        bender.on('job:run', function (id, task) {
            var socket = sockets.clients[id];

            if (!socket) return;

            bender.browsers.setClientReady(id, false);
            socket.emit('run', task);
        });
    }
};
