/**
 * @file Handles Socket.IO connection and events
 * @module App.Sockets
 */
App.module('Sockets', function (Sockets, App, Backbone) {

    Sockets.status = new (Backbone.Model.extend({
        defaults: {
            status: 'disconnected'
        },

        setStatus: function (status) {
            this.set('status', status);
        }
    }))();

    Sockets.StatusView = Backbone.View.extend({
        tagName: 'span',

        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
        },

        render: function () {
            var status = this.model.get('status');
            
            this.el.innerHTML = status;
            this.el.className = 'label label-' + (status === 'connected' ? 'success' :
                status === 'reconnecting' ? 'warning' : 'danger');
        }
    });

    Sockets.addInitializer(function () {
        var socketUrl = 'http://' + window.location.hostname + ':' +
                window.location.port + '/dashboard',
            socket = io.connect(socketUrl),
            $emit = socket.$emit;

        // override socket.io $emit to make module triggering socket events
        socket.$emit = function() {
            Sockets.trigger.apply(Sockets, arguments);
            $emit.apply(socket, arguments);
        };

        // expose socket.io emit method
        Sockets.emit = socket.emit;

        Sockets.on({
            'connect': function () {
                socket.emit('register');
                Sockets.status.setStatus('connected');
            },
            'reconnect': function () {
                Sockets.status.setStatus('reconnecting');
            },
            'reconnecting': function () {
                Sockets.status.setStatus('reconnecting');
            },
            'reconnect_failed': function () {
                Sockets.status.setStatus('disconnected');
            },
            'disconnect': function () {
                Sockets.status.setStatus('disconnected');
            }
        });

        App.socketStatus.show(new Sockets.StatusView({
            model: Sockets.status
        }));
    });
});
