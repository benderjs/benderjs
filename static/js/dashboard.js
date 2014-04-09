(function (window, Ember) {

    var App = Ember.Application.create({
        Socket: EmberSockets.extend({
            host: window.location.hostname,
            port: window.location.port,
            namespace: 'dashboard',
            options: {
                'reconnection limit': 2000,
                'max reconnection attempts': 30
            },
            controllers: ['index', 'browsers', 'tests']
        })
    });

    App.status = Ember.Object.create({
        text: 'disconnected',
        css: 'label-danger'
    });

    App.Router.map(function () {
        this.resource('tests');
        this.resource('jobs');
        this.resource('browsers');
    });

    App.JobsRoute = Ember.Route.extend({
        model: function () {
            return [];
        }
    });

    function updateStatus(status) {
        var css = status === 'connected' ? 'success' :
                  status === 'reconnecting' ? 'warning' : 'danger';

        return function () {
            App.status.setProperties({ text: status, css: 'label-' + css });
        };
    }

    App.IndexController = Ember.Controller.extend({
        sockets: {
            connect: function () {
                this.socket.emit('register');
                updateStatus('connected')();
            },
            reconnect: updateStatus('reconnecting'),
            reconnecting: updateStatus('reconnecting'),
            reconnect_failed: updateStatus('disconnected'),
            disconnect: updateStatus('disconnected')
        }
    });

    App.BrowsersController = Ember.ArrayController.extend({
        content: [],

        sockets: {
            'clients:update': function (data) {
                this.set('content', data);
            }
        }
    });

    App.TestsController = Ember.ArrayController.extend({
        content: [],

        tags: '',

        filteredContent: function () {
            var tags = this.get('tags').trim().split(' '),
                content = this.get('content');

            if (tags.length === 1 && !tags[0]) return content;

            return content.filter(function (test) {
                return tags.every(function (tag) {
                    return test.tags.indexOf(tag) > -1;
                });
            });
        }.property('content.isLoaded', 'tags'),

        sockets: {
            'tests:update': function (data) {
                console.log(data);
                this.set('content', data);
            }
        }
    });

})(this, Ember);
