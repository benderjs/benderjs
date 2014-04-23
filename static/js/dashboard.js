(function (window, Ember, $, Bootstrap, moment, bender) {

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

    App.SocketStatus = Ember.Object.extend({
        status: 'disconnected',

        css: function () {
            var status = this.get('status');

            return status === 'connected' ? 'success' :
                status === 'reconnecting' ? 'warning' : 'danger';
        }.property('status')
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

    App.ApplicationController = Ember.Controller.extend({
        needs: ['tests', 'browsers'],

        browsersCount: Ember.computed.alias('controllers.browsers.clients.length'),
        testsRunning: Ember.computed.alias('controllers.tests.testStatus.running'),

        tabs: [
            { target: 'tests', name: 'Tests' },
            { target: 'jobs', name: 'Jobs' },
            { target: 'browsers', name: 'Browsers', browsers: true }
        ],

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

    App.TestsRoute = Ember.Route.extend({
        model: function () {
            return $.getJSON('/tests');
        },

        setupController: function (controller, model) {
            var tags = model.reduce(function (result, current) {
                    current.isChecked = true;
                    current.status = 'waiting'; // test status - waiting, running, done
                    current.result = null; // test result
                    return result.concat(current.tags.split(', '));
                }, []);

            controller.set('model', model);
            controller.set('tags', tags.uniq());
        }
    });

    App.TestsController = Ember.ArrayController.extend({
        needs: ['browsers'],

        itemController: 'test',

        isChecked: true,

        search: '',

        tags: [],

        testStatus: App.TestStatus.create(),

        createJobButtons: [
            Ember.Object.create({ title: 'Cancel', dismiss: 'modal' }),
            Ember.Object.create({ title: 'Create', clicked: 'createJob' })
        ],

        job: Ember.Object.extend({
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
        }).create(),

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

        checked: function () {
            return this.get('filtered')
                .filterBy('isChecked', true)
                .map(function (item) {
                    return item.id;
                });
        }.property('content.@each.isChecked', 'filtered'),

        resetTests: function () {
            this.get('content').forEach(function (item) {
                Ember.set(item, 'status', 'waiting');
                Ember.set(item, 'result', null);
            });
        },

        actions: {
            runTests: function () {
                var tests = this.get('checked');

                if (!tests.length) {
                    Bootstrap.NM.push('You must select at least 1 test to run!', 'warning');
                    return;
                }

                if (this.testStatus.get('running')) {
                    bender.stop();
                } else {
                    bender.run([].concat(tests));
                    this.resetTests();
                    this.testStatus.start();
                }
            },

            addTag: function (tag) {
                this.set('search', tag);
            },

            clearFilter: function () {
                this.set('search', '');
            },

            openCreateJob: function () {
                if (!this.get('checked').length)
                    return Bootstrap.NM.push('You must specify at least one test for the job!', 'warning');

                Bootstrap.ModalManager.open(
                    'create-job',
                    'Create New Job',
                    'create-job',
                    this.createJobButtons,
                    this
                );
            },

            createJob: function () {
                var job = this.job,
                    browsers = job.get('browsers');

                if (!browsers.length)
                    return Bootstrap.NM.push('You must specify at least one browser for the job!', 'warning');
                
                $.post('/jobs', {
                    description: this.job.get('description'),
                    browsers: browsers,
                    tests: this.get('checked')
                }, function (data) {
                    Bootstrap.NM.push('Successfully created new job - ' + data.id, 'success');
                    Bootstrap.ModalManager.close('create-job');
                    job.set('browsersText', '').set('description', '');
                }, 'json')
                .fail(function () {
                    Bootstrap.NM.push('Couldn\'t create new job due to server error', 'danger');
                });
            },

            addBrowser: function (name) {
                this.job.addBrowser(name);
            }
        }
    });

    App.TestController = Ember.ObjectController.extend({
        singleUrl: function () {
            return '/single/' + this.get('id');
        }.property('id'),

        resultCss: function () {
            var result = this.get('result'),
                css;
            
            if (!result) return '';

            css = result.success ? 'success' : 'danger';

            return css + ' bg-' + css + ' text-' + css;
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

    App.JobsRoute = Ember.Route.extend({
        model: function () {
            return $.getJSON('/jobs');
        }
    });

    App.JobsController = Ember.ArrayController.extend({
        itemController: 'job-row',
        sortProperties: ['created'],
        sortAscending: false
    });

    App.JobRowController = Ember.ObjectController.extend({
        parsedResults: function () {
            var results = this.get('results');

            return results.map(function (result) {
                var status,
                    icon;

                icon = result.status === 0 ? 'time' :
                    result.status === 1 ? 'refresh' :
                    result.status === 2 ? 'ok' : 'remove';

                status = result.status === 2 ? 'success' :
                    result.status === 3 ? 'danger' : 'info';

                result.statusCss = status + ' bg-' + status + ' text-' + status;
                result.iconCss = 'glyphicon-' + icon;

                return result;
            });
        }.property('results')
    });

    App.JobRoute = Ember.Route.extend({
        model: function (params) {
            return $.getJSON('/jobs/' + params.job_id);
        }
    });

    App.JobController = Ember.ObjectController.extend({
        sortResults: function (prev, next) {
            var pv = parseInt(prev.version, 10),
                nv = parseInt(next.version, 10);

            return prev.name > next.name ? 1 : prev.name < next.name ? -1 :
                pv > nv ? 1 : pv < nv ? -1 : 0;
        },

        browsers: function () {
            var task = this.get('tasks')[0];

            if (!task) return [];

            return task.results.sort(this.sortResults);
        }.property('tasks'),

        parsedTasks: function () {
            var tasks = this.get('tasks'),
                that = this;

            function parseResult(result) {
                var status,
                    icon;

                icon = result.status === 0 ? 'time' :
                    result.status === 1 ? 'refresh' :
                    result.status === 2 ? 'ok' : 'remove';

                status = result.status === 2 ? 'success' :
                    result.status === 3 ? 'danger' : 'info';

                result.statusCss = status + ' bg-' + status + ' text-' + status;
                result.iconCss = 'glyphicon-' + icon;

                return result;
            }

            return tasks.map(function (task) {
                task.results = task.results
                    .map(parseResult)
                    .sort(that.sortResults);

                return task;
            });
        }.property('tasks')
    });

    App.BrowsersController = Ember.ArrayController.extend({
        clients: function () {
            return this.get('content')
                .reduce(function (result, current) {
                    return result.concat(current.clients);
                }, []);
        }.property('content'),

        sockets: {
            'browsers:update': function (data) {
                this.set('content', data);
            },
            'client:update': function (data) {
                var client = this.get('clients').findBy('id', data.id);

                if (client) Ember.setProperties(client, data);
            },
            disconnect: function () {
                this.get('content').clear();
            }
        }
    });

    Bootstrap.NM = Bootstrap.NotificationManager = Ember.Object.create({
        content: Ember.A(),

        push: function(message, type) {
            return this.get('content')
                .pushObject(
                    Ember.Object.create({
                        message: message,
                        type: type || 'info'
                    })
                );
        }
    });

    Bootstrap.NotificationView = Ember.View.extend({
        classNames: ['alert', 'notification'],
        template: Ember.Handlebars.compile('{{view.content.message}}'),
        classNameBindings: ['alertType'],
        isVisible: false,

        alertType: function () {
            var type = this.get('content').get('type');

            return type ? 'alert-' + type : null;
        }.property('content'),
        
        didInsertElement: function () {
            this.$().fadeIn(this.get('fadeInTime'));
        },

        click: function () {
            this.$().hide();
        }
    });

    Bootstrap.NotificationsView = Ember.CollectionView.extend({
        classNames: ['notifications'],
        attributeBindings: ['style'],
        contentBinding: 'Bootstrap.NM.content',
        itemViewClass: Bootstrap.NotificationView,
        
        showTime: 2000,
        fadeInTime: 500,
        fadeOutTime: 500,
        showTimeout: null,
        
        contentChanged: function () {
            if (this.get('content').length) this.resetShowTime();
        }.observes('content.length'),
        
        resetShowTime: function () {
            this.$().css('display', 'block');
            
            if (this.$().is(':animated')) {
                this.$().stop().animate({
                    opacity: '100'
                });
            }
            
            if (this.showTimeout) clearTimeout(this.showTimeout);

            this.showTimeout = setTimeout(this.fadeOut, this.showTime, this);
        },
        
        fadeOut: function(that) {
            return that.$().fadeOut(that.fadeOutTime, function () {
                return that.get('content').clear();
            });
        },
        
        mouseEnter: function () {
            if (this.$().is(':animated')) {
                this.$().stop().animate({
                    opacity: '100'
                });
            }

            if (this.showTimeout) clearTimeout(this.showTimeout);
        },

        mouseLeave: function () {
          this.resetShowTime();
        }
    });

    Ember.Handlebars.helper('bs-notifications', Bootstrap.NotificationsView);

    Bootstrap.LabelView = Ember.View.extend({
        classNames: ['label'],
        classNameBindings: ['labelType'],
        tagName: 'span',
        template: Ember.Handlebars.compile('{{view.text}}'),

        labelType: function () {
            return 'label-' + this.get('type');
        }.property('type')
    });

    Ember.Handlebars.helper('bs-label', Bootstrap.LabelView);

    Bootstrap.MomentView = Ember.View.extend({
        template: Ember.Handlebars.compile('{{view.converted}}'),
        classNames: ['moment'],
        tagName: 'span',

        converted: function () {
            return moment(this.get('time')).fromNow();
        }.property('time')
    });

    Ember.Handlebars.helper('bs-moment', Bootstrap.MomentView);

    // enable data-toggle attribute for inputs
    Ember.TextField.reopen({
        attributeBindings: ['data-toggle']
    });

})(this, Ember, Ember.$, Bootstrap, moment, bender);
