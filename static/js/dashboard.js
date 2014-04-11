(function (window, Ember) {

    function Bender() {
        var contextEl = document.getElementById('context');

        this.current = null;
        this.suite = null;

        this.error = function () {
            console.error.apply(console, arguments);
        };

        // stubbed for compatibility
        this.result = function () {};

        this.log = function () {
            console.log.apply(console, arguments);
        };

        this.next = function (summary) {
            if (summary) {
                summary.id = this.current;
                summary.success = summary.passed === summary.total;
                App.testStatus.update(summary);
            }

            this.current = this.suite.shift();

            if (this.current) {
                App.testStatus.update(this.current);
                contextEl.src = '../tests/' + this.current;
            } else {
                this.complete();
            }
        };

        this.complete = function () {
            App.testStatus.stop();
            contextEl.src = 'about:blank';
        };

        // this will be overriden by a framework adapter
        this.start = this.complete;

        this.ready = function () {
            if (typeof this.start == 'function') this.start();
            this.start = null;
        };

        this.addListener = function (target, name, callback, scope) {
            function handler () { callback.call(scope || this); }

            if (target.addEventListener) {
                target.addEventListener(name, handler, false);
            } else if (target.attachEvent) {
                target.attachEvent('on' + name, handler);
            } else {
                target['on' + name] = handler;
            }
        };

        this.removeListener = function (target, name, callback) {
            if (target.removeEventListener) {
                target.removeEventListener(name, callback, false);
            } else {
                target.detachEvent('on' + name, callback);
            }
        };

        this.setup = function (context) {
            context.bender = this;
            context.onerror = this.error;
            this.addListener(context, 'load', this.ready, this);
        };
    }

    window.bender = new Bender();

    

    window.App = Ember.Application.create({
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

    App.testStatus = Ember.Object.extend({
        _defaults: {
            passed: 0,
            failed: 0,
            time: 0,
            timeText: '0h 00m 00s 000ms',
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
            this.set('running', true);
        },

        stop: function () {
            this.set('running', false);
        },

        updateTimeText: function () {
            var ms = this.get('time'),
                h, m, s;

            s = Math.floor(ms / 1000);
            ms %= 1000;
            m = Math.floor(s / 60);
            s %= 60;
            h = Math.floor(m / 60);
            m %= 60;

            this.set('timeText', h + 'h ' + (m < 10 ? '0' : '') + m + 'm ' +
                (s < 10 ? '0' : '') + s + 's ' +
                (ms < 10 ? '00' : ms < 100 ? '0' : '') + ms + 'ms');
        }.observes('time')
    }).create();

    App.socketStatus = Ember.Object.extend({
        status: 'disconnected',
        css: 'label-danger',

        updateCss: function () {
            var status = this.get('status');

            this.set('css', 'label-' + (status === 'connected' ? 'success' :
                status === 'reconnecting' ? 'warning' : 'danger'));
        }.observes('status')
    }).create();

    App.Router.map(function () {
        this.resource('tests');
        this.resource('jobs');
        this.resource('browsers');
    });

    App.IndexRoute = Ember.Route.extend({
        redirect: function () {
            this.transitionTo('tests');
        }
    });

    App.IndexController = Ember.Controller.extend({
        sockets: {
            connect: function () {
                this.socket.emit('register');
                App.socketStatus.set('status', 'connected');
            },
            reconnect: function () {
                App.socketStatus.set('status', 'reconnecting');
            },
            reconnecting: function () {
                App.socketStatus.set('status', 'reconnecting');
            },
            reconnect_failed: function () {
                App.socketStatus.set('status', 'disconnected');
            },
            disconnect: function () {
                App.socketStatus.set('status', 'disconnected');
            }
        }
    });

    App.BrowsersController = Ember.ArrayController.extend({
        content: [],

        sockets: {
            'clients:update': function (data) {
                this.set('content', data);
            },

            disconnect: function () {
                this.set('content', []);
            }
        }
    });

    App.TestController = Ember.ObjectController.extend({
        singleUrl: function () {
            return '/single/' + this.get('id');
        }.property('id'),

        resultCss: function () {
            var result = this.get('result');
            
            if (!result) return '';

            return result.success ? 'success' : 'danger';
        }.property('status'),

        iconCss: function () {
            var result = this.get('result');
            
            if (!result) return '';

            return 'glyphicon-' + (result.success ? 'ok' : 'remove');
        }.property('status'),

        statusText: function () {
            var status = this.get('status'),
                result;

            if (status === 'waiting') return '';
            if (status === 'running') return 'Running...';

            result = this.get('result');

            return result.passed + ' passed / ' + result.failed + ' failed ' +
                ' in ' + result.runtime + 'ms';
        }.property('status', 'result')
    });

    App.TestsController = Ember.ArrayController.extend({
        itemController: 'test',

        isChecked: true,

        content: [],

        search: '',

        tags: [],

        updateRunning: function () {
            var id = App.testStatus.get('current'),
                current = this.get('content').findBy('id', id);

            if (!id ||!current) return;

            Ember.set(current, 'status', 'running');
        }.observes('App.testStatus.current'),

        updateResult: function () {
            var result,
                current;

            if (!(result = App.testStatus.get('currentResult')) ||
                !(current = this.get('content').findBy('id', result.id))) return;

            Ember.set(current, 'status', 'done');
            Ember.set(current, 'result', result);
        }.observes('App.testStatus.currentResult'),

        toggleChecked: function () {
            var checked = this.get('isChecked');

            this.get('filtered').forEach(function (item) {
                Ember.set(item, 'isChecked', checked);
            });
        }.observes('isChecked'),

        resetStatus: function () {
            this.get('content').forEach(function (item) {
                Ember.set(item, 'status', 'waiting');
                Ember.set(item, 'result', null);
            });
        },

        filtered: function () {
            var search = this
                    .get('search')
                        .trim()
                        .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
                content = this.get('content'),
                reg;

            if (!search) return content;

            reg = new RegExp(search, 'i');

            return content.filter(function (test) {
                return reg.test(test.tags);
            });
        }.property('content.isLoaded', 'search'),

        prepareData: function (data) {
            var tags = data.reduce(function (result, current) {
                    current.isChecked = true;
                    current.status = 'waiting'; // test status - waiting, running, done
                    current.result = null; // test result
                    return result.concat(current.tags.split(', '));
                }, []);

            this.set('tags', tags.uniq());
        },

        actions: {
            runTests: function () {
                var tests = this.get('filtered')
                    .filterProperty('isChecked')
                    .map(function (item) {
                        return item.id;
                    });

                bender.suite = tests;
                bender.next();

                if (App.testStatus.get('running')) {
                    bender.suite = [];
                    bender.complete();
                } else {
                    this.resetStatus();
                    App.testStatus.init();
                    App.testStatus.start();
                }
            },

            addTag: function (tag) {
                this.set('search', tag);
            }
        },

        sockets: {
            'tests:update': function (data) {
                // stop testing if necessary
                if (App.testStatus.get('running')) {
                    bender.suite = [];
                    bender.complete();
                }
                this.prepareData(data);
                this.set('content', data);
            },

            disconnect: function () {
                this.set('content', []);
            }
        }
    });

    // enable data-toggle attribute for inputs
    Ember.TextField.reopen({
        attributeBindings: ['data-toggle']
    });

})(this, Ember);
