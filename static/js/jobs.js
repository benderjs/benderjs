App.module('Jobs', function (Jobs, App, Backbone) {
    
    /**
     * Router for Jobs module
     */
    Jobs.Router = Marionette.AppRouter.extend({
        name: 'jobs',

        appRoutes: {
            'jobs': 'listJobs'
        }
    });

    /**
     * Job model
     */
    Jobs.Job = Backbone.Model.extend({
        defaults: {
            description: '',
            created: 0,
            results: []
        }
    });

    /**
     * Job table row view
     */
    Jobs.JobRowView = Backbone.Marionette.ItemView.extend({
        template: '#job-row',
        tagName: 'tr',

        templateHelpers: {
            getTime: function (timestamp) {
                return moment(timestamp).fromNow();
            },

            getResultStyle: function (result) {
                var status = result.status === 2 ? 'success' :
                    result.status === 3 ? 'danger' : 'info';

                return status + ' bg-' + status + ' text-' + status;
            },

            getIcon: function (result) {
                return 'glyphicon-' + (result.status === 0 ? 'time' :
                    result.status === 1 ? 'refresh' :
                    result.status === 2 ? 'ok' :
                    'remove');
            }
        }
    });

    /**
     * Job collection
     */
    Jobs.jobsList = new (Backbone.Collection.extend({
        model: Jobs.Job,
        url: '/jobs',

        parse: function (response) {
            return response.job;
        }
    }))();

    /**
     * Jobs tab header view
     */
    Jobs.JobsHeaderView = Backbone.Marionette.ItemView.extend({
        template: '#jobs-header',
        className: 'row',

        ui: {
            'create': '.create-button',
        },

        events: {
            'click @ui.create': 'createJob',
        },

        createJob: function () {
            // TODO
            console.log('create job');
        }
    });

    /**
     * Jobs list view
     */
    Jobs.JobsListView = App.TableView.extend({
        template: '#jobs',
        itemView: Jobs.JobRowView,
        emptyView: Jobs.NoJobsView
    });

    /**
     * Empty jobs list view
     */
    Jobs.NoJobsView = Backbone.Marionette.ItemView.extend({
      template: '#no-jobs',
      tagName: 'tr'
    });

    /**
     * Controller for Jobs module
     * @type {Object}
     */
    Jobs.controller = {
        listJobs: function () {
            App.header.show(new Jobs.JobsHeaderView());

            App.content.show(new Jobs.JobsListView({
                collection: Jobs.jobsList
            }));

            Jobs.jobsList.fetch();
        }
    };

    /**
     * Add Jobs module initializer
     */
    Jobs.addInitializer(function () {
        Jobs.router = new Jobs.Router({
            controller: Jobs.controller
        });

        Jobs.on('tests:list', function () {
            App.navigate('jobs');
            Jobs.controller.listJobs();
        });

    });
});
