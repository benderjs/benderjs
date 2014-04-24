(function (window, Ember, EmberSockets) {

    window.App = Ember.Application.create({
        Socket: EmberSockets.extend({
            host: window.location.hostname,
            port: window.location.port,
            namespace: 'dashboard',
            options: {
                'reconnection delay': 2000,
                'reconnection limit': 2000,
                'max reconnection attempts': Infinity
            },
            controllers: ['application', 'browsers']
        })
    });

    App.TestStatus = Ember.Object.extend({
        _defaults: {
            passed: 0,
            failed: 0,
            time: 0,
            running: false,
            current: null,
            currentResult: null
        },

        init: function () {
            this.setProperties(this._defaults);
        },

        update: function (data) {
            if (typeof data == 'string') return this.set('current', data);

            this.incrementProperty('passed', data.passed);
            this.incrementProperty('failed', data.failed);
            this.incrementProperty('total', data.total);
            this.incrementProperty('time', data.runtime);

            this.set('currentResult', data);
        },

        start: function () {
            this.init();
            this.set('running', true);
        },

        stop: function () {
            this.set('running', false);
        },

        timeText: function () {
            var ms = this.get('time'),
                h, m, s;

            s = Math.floor(ms / 1000);
            ms %= 1000;
            m = Math.floor(s / 60);
            s %= 60;
            h = Math.floor(m / 60);
            m %= 60;

            return h + 'h ' + (m < 10 ? '0' : '') + m + 'm ' +
                (s < 10 ? '0' : '') + s + 's ' +
                (ms < 10 ? '00' : ms < 100 ? '0' : '') + ms + 'ms';
        }.property('time')
    });

    App.newJob = Ember.Object.extend({
        description: '',
        browsersText: '',

        browsers: function () {
            return this.get('browsersText')
                .trim().split(' ')
                    .uniq()
                    .filter(function (item) {
                        return item;
                    });
        }.property('browsersText'),

        addBrowser: function (name) {
            this.set('browsersText', this.get('browsersText').trim() + ' ' + name);
        }
    }).create();

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
