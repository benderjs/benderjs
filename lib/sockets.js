/**
 * @file Web Socket class
 */

var sIO = require('socket.io'),
    logger = require('./logger'),
    log = logger.create('socket-io', { console: { level: 'info' } }, true);

/**
 * Web Socket handler
 * @param {Object} clients Clients collection
 * @param {Object} tests   Test handler
 */
function Socket(clients, tests) {
    this.clients = clients;
    this.tests = tests;
    this.dashboard = null;
    this.socket = null;
}

/**
 * Attach a Web Socket handler to the existing HTTP Server
 * @param {Object} server HTTP Server
 */
Socket.prototype.attach = function (server) {
    var io = sIO.listen(server);

    io.set('logger', log);

    this.sockets = io.sockets;

    this.sockets.on('connection', this.createHandler(this.clients, this.tests));

    // emit updated client list when client list changes
    this.clients.on('change', function () {
        this.sockets.emit('client_list', this.clients.list());
    }.bind(this));
};

/**
 * Create a function handling Web Socket
 * @return {Function}
 */
Socket.prototype.createHandler = function () {
    /**
     * Handle Web Socket messages and events
     * @param {Object} socket Web Socket
     */
    return function (socket) {
        socket.on('register', function (client) {
            this.clients.add({
                id: client.id,
                ua: client.ua,
                socket: socket
            });

            log.info('client registered', client.id);
        }.bind(this));

        socket.on('register_dashboard', function () {
            if (this.dashboard) return;

            this.dashboard = socket;
            this.dashboard.emit('client_list', this.clients.list());

        }.bind(this));

        socket.on('result', function (suite, result) {
            var client = this.clients.get({
                socket: socket
            });

            if (this.dashboard) this.dashboard.emit('result', client.id, suite, result);

            log.info('result', result);
        }.bind(this));

        socket.on('complete', function (result) {
            var client = this.clients.get({
                    socket: socket
                });

            client.setBusy(false);

            if (this.dashboard) this.dashboard.emit('complete', client.id, result);

            log.info('complete', client.id);
        }.bind(this));

        socket.on('error', function (error) {
            log.error(error);
        });

        socket.on('log', function (msg) {
            log.info(msg);
        });

        socket.on('run', function (ids) {
            log.info('start tests', ids);

            if (this.clients.checkReady()) {
                this.clients.forEach(function (client) {
                    client.setBusy(true);
                });

                this.sockets.json.emit('run', this.tests.get(ids));
            } else {
                log.info('not all the clients are ready at the moment');
            }
        }.bind(this));

        socket.on('disconnect', function () {
            var client = this.clients.get({
                    socket: socket
                });

            if (client) {
                log.info('client disconnected', client.id);
                this.clients.remove(client);
            }

            if (socket == this.dashboard) {
                this.dashboard = null;
            }
        }.bind(this));
    }.bind(this);
};

module.exports = {

    name: 'sockets',

    attach: function () {
        var bender = this;

        if (!bender.clients || !bender.tests) {
            logger.error('Sockets module requires: clients, tests');
            process.exit(1);
        }

        bender.sockets = new Socket(bender.clients, bender.tests);
    }
};
