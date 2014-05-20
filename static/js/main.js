(function (window, Ember, EmberSockets) {

    var App = window.App = new Backbone.Marionette.Application();

    App.socket = null;
    App.socketUrl = 'http://' + window.location.hostname + ':' +
        window.location.port + '/dashboard';

    App.addInitializer(function () {
        App.socket = io.connect(App.socketUrl);

        App.socket.on('connect', function () {
            App.socket.emit('register');
            // this.socketStatus.set('status', 'connected');
        });
        App.socket.on('reconnect', function () {
            // this.socketStatus.set('status', 'reconnecting');
        });
        App.socket.on('reconnecting', function () {
            // this.socketStatus.set('status', 'reconnecting');
        });
        App.socket.on('reconnect_failed', function () {
            // this.socketStatus.set('status', 'disconnected');
        });
        App.socket.on('disconnect', function () {
            // this.socketStatus.set('status', 'disconnected');
        });
    });










    App.start();



// OLD EMBER CODE >>>
    window.App = Ember.Application.create({
        Socket: EmberSockets.extend({
            host: window.location.hostname,
            port: window.location.port,
            path: 'dashboard',
            options: {
                'reconnection delay': 2000,
                'reconnection limit': 2000,
                'max reconnection attempts': Infinity
            },
            controllers: ['application', 'browsers']
        })
    });

    App.Router.map(function () {
        this.resource('tests');
        this.resource('jobs');
        this.resource('job', { path: '/jobs/:job_id' });
        this.resource('browsers');
    });


    App.IndexRoute = Ember.Route.extend({
        redirect: function () {
            this.transitionTo('tests');
        }
    });

    App.ErrorRoute = Ember.Route.extend({
        renderTemplate: function () {
            if (this.get('controller.content.status') === 404)  {
                this.render('error404');
            } else {
                this.render();
            }
        }
    });

    App.ApplicationController = Ember.Controller.extend({
        needs: ['tests', 'browsers'],

        browsersCount: Ember.computed.alias('controllers.browsers.clients.length'),
        testsRunning: Ember.computed.alias('controllers.tests.testStatus.running'),

        tabs: [
            { target: 'tests', name: 'Tests' },
            { target: 'jobs', name: 'Jobs' },
            { target: 'browsers', name: 'Browsers', browsers: true }
        ],

        socketStatus: Ember.Object.extend({
            status: 'disconnected',

            css: function () {
                var status = this.get('status');

                return status === 'connected' ? 'success' :
                    status === 'reconnecting' ? 'warning' : 'danger';
            }.property('status')
        }).create(),

        sockets: {
            connect: function () {
                this.socket.emit('register');
                this.socketStatus.set('status', 'connected');
            },
            reconnect: function () {
                this.socketStatus.set('status', 'reconnecting');
            },
            reconnecting: function () {
                this.socketStatus.set('status', 'reconnecting');
            },
            reconnect_failed: function () {
                this.socketStatus.set('status', 'disconnected');
            },
            disconnect: function () {
                this.socketStatus.set('status', 'disconnected');
            }
        }
    });

})(this, Ember, EmberSockets);
