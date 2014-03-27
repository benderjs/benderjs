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

        function handleSocket(socket) {
            socket.on('register:client', function (client) {
                bender.emit('client:register', {
                    id: client.id,
                    ua: client.ua,
                    socket: socket
                });
            });

            socket.on('register:dashboard', function () {
                bender.emit('client:register', {
                    dashboard: true,
                    socket: socket
                });
            });

            socket.on('result', function (suite, result) {
                var client = bender.clients.get({
                        socket: socket
                    });

                bender.emit('test:result', {
                    client: client.id,
                    suite: suite,
                    result: result
                });
            });

            socket.on('complete', function (result) {
                var client = bender.clients.get({
                        socket: socket
                    });

                client.setBusy(false);

                bender.emit('test:complete', {
                    client: client.id,
                    result: result
                });

                // TODO check if all clients are ready and then run a test from QUEUE
            });

            socket.on('error', function (error) {
                bender.emit('test:error', error);
            });

            socket.on('log', function (msg) {
                bender.emit('test:log', msg);
            });

            socket.on('run', function (ids) {
                if (bender.clients.checkReady()) {
                    bender.clients.forEach(function (client) {
                        client.setBusy(true);
                    });

                    this.sockets.json.emit('run', bender.tests.get(ids));

                    bender.emit('test:run', ids);
                } else {
                    // TODO add to queue
                    bender.emit('test:queue', ids);
                }
            }.bind(this));

            socket.on('disconnect', function () {
                bender.emit('client:disconnect', {
                    socket: socket
                });
            });
        }

        sockets.attach = function (server) {
            var io = sIO.listen(server, { logger: log });

            this.sockets = io.sockets;
            this.sockets.on('connection', handleSocket);

            // emit updated client list when client list changes
            bender.clients.on('change', function () {
                this.sockets.emit('client:list', bender.clients.list());
            }.bind(this));
        };
    }
};
