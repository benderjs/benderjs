(function (Ember, App, $, bender, Bootstrap) {

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
                    [
                        Ember.Object.create({ title: 'Cancel', dismiss: 'modal' }),
                        Ember.Object.create({ title: 'Create', clicked: 'createJob' })
                    ],
                    this
                );
            },

            createJob: function () {
                var job = App.newJob,
                    browsers = job.get('browsers');

                if (!browsers.length)
                    return Bootstrap.NM.push('You must specify at least one browser for the job!', 'warning');
                
                $.post('/jobs', {
                    description: job.get('description'),
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
                App.newJob.addBrowser(name);
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

})(Ember, App, Ember.$, bender, Bootstrap);
