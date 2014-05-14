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
        },
        actions: {
            openModal: function (modalName, errors) {
                this.controller.set('errors', errors);
                return this.render(modalName, {
                    into: 'application',
                    outlet: 'modal'
                });
            },
            closeModal: function () {
                this.disconnectOutlet({
                    outlet: 'modal',
                    parentView: 'application'
                });
            }
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

            return task.results;
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
                        .map(parseResult);

                    return task;
                });
        }.property('tasks'),

        errors: null
    });

    App.JobErrorsModalView = Ember.View.extend({
        name: 'job-errors-modal',
        layoutName: 'modal',
        templateName: 'job-errors',
        isVisible: true
    });

})(Ember, App, Ember.$);
