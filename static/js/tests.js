(function (Ember, App, $, bender) {

    var TestStatus = Ember.Object.extend({
            _defaults: {
                passed: 0,
                failed: 0,
                ignored: 0,
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
                this.incrementProperty('ignored', data.ignored);
                this.incrementProperty('total', data.total);
                this.incrementProperty('time', data.duration);

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
        }),

        newJob = Ember.Object.extend({
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

    App.Test = DS.Model.extend({
        group: DS.attr('string'),
        tags: DS.attr('string'),

        singleUrl: function () {
            return '/tests/' + this.get('id');
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

            return result.passed + ' passed / ' + result.failed + ' failed' +
                (result.ignored ? (' / ' + result.ignored + ' ignored') : '') +
                ' in ' + result.duration + 'ms';
        }.property('status', 'result')
    });

    App.TestsRoute = Ember.Route.extend({
        model: function () {
            return this.store.find('test');
        },

        setupController: function (controller, model) {
            // build tags array used for filtering
            var tags = model.reduce(function (result, current) {
                    // set default status of a test
                    current.set('status', 'waiting');
                    return result.concat(current.get('tags').split(', '));
                }, []);

            controller.setProperties({
                model: model,
                tags: tags.uniq(),
                isChecked: false
            });
        },

        closeCreateJob: function () {
            this.disconnectOutlet({
                outlet: 'modal',
                parentView: 'application'
            });
        },

        actions: {
            openCreateJob: function () {
                if (!this.controller.get('checked').length)
                    return App.NM.push('You must specify at least one test for the job!', 'warning');

                return this.render('create-job-modal', {
                    into: 'application',
                    outlet: 'modal'
                });
            },

            closeCreateJob: function () {
                return this.closeCreateJob();
            },

            createJob: function () {
                var job = newJob,
                    browsers = job.get('browsers'),
                    controller = this.get('controller'),
                    that = this;

                if (!browsers.length)
                    return App.NM.push('You must specify at least one browser for the job!', 'warning');
                
                controller.set('isCreating', true);

                $.post('/jobs', {
                    description: job.get('description'),
                    browsers: browsers,
                    tests: controller.get('checked')
                }, function (data) {
                    App.NM.push(
                        'Successfully created new job - <a href="/#/jobs/' + data.id + '">' + data.id + '</a>',
                        'success'
                    );
                    job.set('browsersText', '').set('description', '');
                    controller.set('isCreating', false);
                    that.closeCreateJob();
                }, 'json')
                .fail(function () {
                    App.NM.push('Couldn\'t create new job due to server error', 'danger');
                    controller.set('isCreating', false);
                });
            },
        }
    });

    App.TestsController = Ember.ArrayController.extend({
        needs: ['browsers'],

        isChecked: false,
        isCreating: false,
        search: '',
        tags: [],
        testStatus: TestStatus.create(),
        newJob: newJob,

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

            current.set('status', 'running');
        }.observes('testStatus.current'),

        updateResult: function () {
            var result,
                current;

            if (!(result = this.testStatus.get('currentResult')) ||
                !(current = this.get('content').findBy('id', result.id))) return;

            current.setProperties({
                status: 'done',
                result: result
            });

        }.observes('testStatus.currentResult'),

        toggleChecked: function () {
            var checked = this.get('isChecked');

            this.get('filtered').forEach(function (item) {
                item.set('isChecked', checked);
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
                return reg.test(test.get('tags'));
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
                item.setProperties({
                    status: 'waiting',
                    result: null
                });
            });
        },

        actions: {
            runTests: function () {
                var tests = this.get('checked');

                if (!tests.length) {
                    App.NM.push('You must select at least 1 test to run!', 'warning');
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

            addBrowser: function (name) {
                newJob.addBrowser(name);
            }
        }
    });

    App.CreateJobModalView = Ember.View.extend({
        name: 'create-job-modal',
        layoutName: 'modal',
        templateName: 'create-job',
        isVisible: true
    });

})(Ember, App, Ember.$, bender);
