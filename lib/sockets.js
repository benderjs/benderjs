var sockets = require('socket.io'),
    clients = require('./clients'),
    runner = require('./runner'),
    log = require('./logger').create('socket-io', { console: { level: 'info' } }, true);

/**
 * Handle Web Socket messages and events
 * @param  {Object} socket Web Socket
 */
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
        var client = clients.get({
                socket: socket
            });

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
        var client = clients.get({
                socket: socket
            });

        if (client) {
            log.info('client disconnected', client.id);
            clients.remove(client);
        }
    });
}

/**
 * Attach a Web Socket to existing HTTP Server
 * @param  {Object} server HTTP Server
 */
function attach(server) {
    var io = sockets.listen(server);

    io.set('logger', log);
    io.sockets.on('connection', handleSocket);

    // emit updated client list when client list changes
    clients.on('change', function () {
        io.sockets.emit('client_list', clients.list());
    });
}

module.exports.attach = attach;
