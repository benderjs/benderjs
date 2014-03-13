var sockets = require('socket.io'),
    clients = require('./clients'),
    runner = require('./runner');

module.exports.attach = function (server) {
    var io = sockets.listen(server);

    io.sockets.on('connection', function (socket) {
        console.log('[NEW SOCKET CONNECTION]');

        socket.on('register', function (client) {
            clients.add({
                id: client.id,
                ua: client.ua,
                socket: socket
            });

            console.log('[CLIENT REGISTERED]', client.id);
        });

        socket.on('result', function (result) {
            console.log('[RESULT]', result);
        });

        socket.on('complete', function () {
            var client = clients.getBy('socket', socket);

            if (client) {
                client.setBusy(false);
            }

            console.log('[COMPLETE]');
        });

        socket.on('error', function (error) {
            console.error('[ERROR]', error);
        });

        socket.on('log', function (error) {
            console.log('[LOG]', error);
        });

        socket.on('disconnect', function () {
            var client = clients.getBy('socket', socket);

            if (client) {
                console.log('[CLIENT DISCONNECTED]', client.id);
                clients.remove(client);
            }
        });

        socket.on('run', function (tests) {
            console.log('[START TESTS]', tests);
            runner.runTests(tests);
        });
    });

    clients.on('change', function () {
        io.sockets.emit('client_list', clients.getList());
    });
};
