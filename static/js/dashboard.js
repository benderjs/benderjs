(function (window, Ember, bender) {

    window.App = Ember.Application.create({
        Socket: EmberSockets.extend({
            host: window.location.hostname,
            port: window.location.port,
            namespace: 'dashboard',
            options: {
                'reconnection limit': 2000,
                'max reconnection attempts': 30
            },
            controllers: ['application', 'browsers', 'tests']
        })
    });

    App.TestStatus = Ember.Object.extend({
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
            this.init();
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
    });

    App.SocketStatus = Ember.Object.extend({
        status: 'disconnected',
        css: 'label-danger',

        updateCss: function () {
            var status = this.get('status');

            this.set('css', 'label-' + (status === 'connected' ? 'success' :
                status === 'reconnecting' ? 'warning' : 'danger'));
        }.observes('status')
    });

    App.Router.map(function () {
        this.resource('tests');
        this.resource('jobs');
        this.resource('browsers');
    });

    // redirect to tests tab
    App.IndexRoute = Ember.Route.extend({
        redirect: function () {
            this.transitionTo('tests');
        }
    });

    App.ApplicationRoute = Ember.Route.extend({
        actions: {
            openModal: function (name) {
                return this.render(name, {
                    into: 'application',
                    outlet: 'modal'
                });
            },

            closeModal: function () {
                return this.disconnectOutlet({
                    outlet: 'modal',
                    parentView: 'application'
                });
            }
        }
    });

    App.TestsRoute = Ember.Route.extend({
        actions: {
            createJob: function () {
                console.log('create job');
            },

            addBrowser: function (name) {
                console.log('add tag', name);
            }
        }
    });

    App.ApplicationController = Ember.Controller.extend({
        needs: ['browsers', 'tests'],

        socketStatus: App.SocketStatus.create(),

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

    App.TestsController = Ember.ArrayController.extend({
        itemController: 'test',

        isChecked: true,

        content: [],

        search: '',

        tags: [],

        testStatus: App.TestStatus.create(),

        init: function () {
            var that = this;

            bender.on('update', function (data) {
                that.testStatus.update(data);
            });
            bender.on('complete', function () {
                that.testStatus.stop();
            });
        },

        updateRunning: function () {
            var id = this.testStatus.get('current'),
                current = this.get('content').findBy('id', id);

            if (!id ||!current) return;

            Ember.set(current, 'status', 'running');
        }.observes('testStatus.current'),

        updateResult: function () {
            var result,
                current;

            if (!(result = this.testStatus.get('currentResult')) ||
                !(current = this.get('content').findBy('id', result.id))) return;

            Ember.set(current, 'status', 'done');
            Ember.set(current, 'result', result);
        }.observes('testStatus.currentResult'),

        toggleChecked: function () {
            var checked = this.get('isChecked');

            this.get('filtered').forEach(function (item) {
                Ember.set(item, 'isChecked', checked);
            });
        }.observes('isChecked'),

        resetTests: function () {
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

                if (!tests.length) return;

                bender.run(tests);

                if (this.testStatus.get('running')) {
                    bender.stop();
                } else {
                    this.resetTests();
                    this.testStatus.start();
                }
            },

            addTag: function (tag) {
                this.set('search', tag);
            },

            clearFilter: function () {
                this.set('search', '');
            }
        },

        sockets: {
            'tests:update': function (data) {
                // stop testing if necessary
                if (this.testStatus.get('running')) bender.stop();
                this.prepareData(data);
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

    App.BrowsersController = Ember.ArrayController.extend({
        content: [],

        sockets: {
            'browsers:update': function (data) {
                this.set('content', data);
            },

            disconnect: function () {
                this.set('content', []);
            }
        }
    });

    App.ModalDialogComponent = Ember.Component.extend({
        didInsertElement: function () {
            this.$('.modal, .modal-backdrop').addClass('in').show();
        },

        actions: {
            cancel: function () {
                this.sendAction('cancel');
            },

            submit: function () {
                this.sendAction('submit');
            }
        }
    });

    // enable data-toggle attribute for inputs
    Ember.TextField.reopen({
        attributeBindings: ['data-toggle']
    });

})(this, Ember, bender);
