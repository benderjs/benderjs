App.module('Sockets', function (Sockets, App, Backbone) {

    var socket = null,
        socketUrl = 'http://' + window.location.hostname + ':' +
            window.location.port + '/dashboard';

    Sockets.addInitializer(function () {
        socket = io.connect(socketUrl);

        // TODO proxy socket events to Applivation's event bus

        socket.on('connect', function () {
            socket.emit('register');
            // this.socketStatus.set('status', 'connected');
        });
        socket.on('reconnect', function () {
            // this.socketStatus.set('status', 'reconnecting');
        });
        socket.on('reconnecting', function () {
            // this.socketStatus.set('status', 'reconnecting');
        });
        socket.on('reconnect_failed', function () {
            // this.socketStatus.set('status', 'disconnected');
        });
        socket.on('disconnect', function () {
            // this.socketStatus.set('status', 'disconnected');
        });
    });
});
