var sockets = require('socket.io'),
    log = require('./logger').create('socket-io', { console: { level: 'info' } }, true);


/**
 * Web Socket handler
 * @param {Object} clients Clients collection
 * @param {Object} tests   Test handler
 */
function Socket(clients, tests) {
    this.clients = clients;
    this.tests = tests;
    this.dashboard = null;
}

Socket.$inject = ['clients', 'tests'];

/**
 * Attach a Web Socket handler to the existing HTTP Server
 * @param {Object} server HTTP Server
 */
Socket.prototype.attach = function (server) {
    var io = sockets.listen(server);

    io.set('logger', log);
    io.sockets.on('connection', this.createHandler(this.clients, this.tests));

    // emit updated client list when client list changes
    this.clients.on('change', function () {
        io.sockets.emit('client_list', this.clients.list());
    }.bind(this));
};

/**
 * Create a function handling Web Socket
 * @return {Function}
 */
Socket.prototype.createHandler = function (clients, tests) {
    /**
     * Handle Web Socket messages and events
     * @param {Object} socket Web Socket
     */
    return function (socket) {
        socket.on('register', function (client) {
            clients.add({
                id: client.id,
                ua: client.ua,
                socket: socket
            });

            log.info('client registered', client.id);
        });

        socket.on('result', function (result) {
            var dashboard = clients.get({ id: 'dashboard' });
            
            if (dashboard) dashboard.socket.emit('result', result);

            log.info('result', result);
        });

        socket.on('complete', function () {
            var client = clients.get({
                    socket: socket
                }),
                dashboard;

            client.setBusy(false);

            dashboard = clients.get({ id: 'dashboard' });
            
            if (dashboard) dashboard.socket.emit('complete');

            log.info('complete');
        });

        socket.on('error', function (error) {
            log.error(error);
        });

        socket.on('log', function (msg) {
            log.info(msg);
        });

        socket.on('run', function (ids) {
            log.info('start tests', ids);

            if (clients.checkReady()) {
                clients.forEach(function (client) {
                    client.setBusy(true);
                    client.socket.json.emit('run', tests.get(ids));
                });
            } else {
                log.info('not all the clients are ready at the moment');
            }
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
    };
};

module.exports = Socket;
