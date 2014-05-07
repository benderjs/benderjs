(function (Ember, App, $) {

    App.JobsRoute = Ember.Route.extend({
        model: function () {
            return this.store.find('job');
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

    App.Job = DS.Model.extend({
        description: DS.attr('string'),
        created: DS.attr('number'),
        results: DS.attr('raw')
    });

    App.JobController = Ember.ObjectController.extend({
        browsers: function () {
            var task = this.get('tasks')[0];

            if (!task) return [];

            return task.results.sort(function (prev, next) {
                var pv = parseInt(prev.version, 10),
                    nv = parseInt(next.version, 10);

                return prev.name > next.name ? 1 : prev.name < next.name ? -1 :
                    pv > nv ? 1 : pv < nv ? -1 : 0;
            });
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

            return tasks
                .map(function (task) {
                    task.results = task.results
                        .map(parseResult)
                        .sort(that.sortResults);

                    return task;
                })
                .sort(function (prev, next) {
                    return prev.id > next.id ? 1 : prev.id < next.id ? -1 : 0;
                });
        }.property('tasks'),

        errors: null,

        actions: {
            showErrorDetails: function (errors) {
                this.set('errors', errors);

                Bootstrap.ModalManager.open(
                    'error-details',
                    'Test error details',
                    'error-details',
                    [
                        Ember.Object.create({ title: 'Close', dismiss: 'modal' }),
                    ],
                    this
                );
            }
        }
    });

})(Ember, App, Ember.$);
