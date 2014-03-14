var sockets = require('socket.io'),
    clients = require('./clients'),
    runner = require('./runner'),
    log = require('./logger').create('socket-io', { console: { level: 'info' } }, true);

function handleSocket(socket) {
    socket.on('register', function (client) {
        clients.add({
            id: client.id,
            ua: client.ua,
            socket: socket
        });

        log.info('client registered', client.id);
    });

    socket.on('result', function (result) {
        log.info('result', result);
    });

    socket.on('complete', function () {
        var client = clients.getBy('socket', socket);

        client.setBusy(false);

        log.info('complete');
    });

    socket.on('error', function (error) {
        log.error(error);
    });

    socket.on('log', function (msg) {
        log.info(msg);
    });

    socket.on('run', function (tests) {
        log.info('start tests', tests);
        runner.runTests(tests);
    });

    socket.on('disconnect', function () {
        var client = clients.getBy('socket', socket);

        if (client) {
            log.info('client disconnected', client.id);
            clients.remove(client);
        }
    });
}

module.exports.attach = function (server) {
    var io = sockets.listen(server);

    io.set('logger', log);

    io.sockets.on('connection', handleSocket);

    clients.on('change', function () {
        io.sockets.emit('client_list', clients.getList());
    });
};
