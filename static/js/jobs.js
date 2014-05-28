App.module( 'Jobs', function ( Jobs, App, Backbone ) {

    /**
     * Router for Jobs module
     */
    Jobs.Router = Marionette.AppRouter.extend( {
        name: 'jobs',

        appRoutes: {
            'jobs': 'listJobs',
            'jobs/:id': 'showJob'
        }
    } );

    /**
     * Helpers used in underscore templates
     * @type {Object}
     */
    Jobs.templateHelpers = {
        getTime: function ( timestamp ) {
            return moment( timestamp ).fromNow();
        },

        getResultStyle: function ( result ) {
            var status = result.status === 2 ? 'success' :
                result.status === 3 ? 'danger' : 'info';

            return status + ' bg-' + status + ' text-' + status;
        },

        getIcon: function ( result ) {
            return 'glyphicon-' + ( result.status === 0 ? 'time' :
                result.status === 1 ? 'refresh' :
                result.status === 2 ? 'ok' :
                'remove' );
        }
    };

    /**
     * Job row model
     */
    Jobs.JobRow = Backbone.Model.extend( {
        defaults: {
            description: '',
            created: 0,
            results: []
        }
    } );

    /**
     * Job table row view
     */
    Jobs.JobRowView = Backbone.Marionette.ItemView.extend( {
        template: '#job-row',
        tagName: 'tr',
        templateHelpers: Jobs.templateHelpers
    } );

    /**
     * Job collection
     */
    Jobs.jobsList = new( Backbone.Collection.extend( {
        model: Jobs.JobRow,
        url: '/jobs',

        parse: function ( response ) {
            return response.job.sort( function ( a, b ) {
                return a.created < b.created ? 1 :
                    a.created > b.created ? -1 : 0;
            } );
        }
    } ) )();

    /**
     * Jobs tab header view
     */
    Jobs.JobsHeaderView = Backbone.Marionette.ItemView.extend( {
        template: '#jobs-header',
        className: 'row',

        ui: {
            'create': '.create-button'
        },

        events: {
            'click @ui.create': 'createJob'
        },

        createJob: function () {
            // TODO
            console.log( 'create job' );
        }
    } );

    /**
     * Jobs list view
     */
    Jobs.JobsListView = App.Common.TableView.extend( {
        template: '#jobs',
        itemView: Jobs.JobRowView,
        emptyView: Jobs.NoJobsView,

        initialize: function () {
            this.collection.fetch();
        }
    } );

    /**
     * Empty jobs list view
     */
    Jobs.NoJobsView = Backbone.Marionette.ItemView.extend( {
        template: '#no-jobs',
        tagName: 'tr'
    } );


    /**
     * Job details model
     */
    Jobs.Job = Backbone.Model.extend( {
        defaults: {
            id: '',
            description: '',
            created: 0,
            browsers: [],
            tasks: []
        },

        urlRoot: '/jobs/',

        parse: function ( data ) {
            data.browsers = _.map( data.tasks[ 0 ].results, function ( result ) {
                return {
                    name: result.name,
                    version: result.version
                };
            } );

            return data;
        }
    } );

    /**
     * Task row view
     */
    Jobs.TaskView = Backbone.Marionette.ItemView.extend( {
        template: '#task',
        tagName: 'tr',
        templateHelpers: Jobs.templateHelpers,

        events: {
            'click .clickable': 'showError'
        },

        showError: function ( event ) {
            var elem = $( event.currentTarget ),
                result = this.model.get( 'results' )[ elem.index() ];

            if ( result && result.errors )
                App.modal.show(
                    new Jobs.TaskErrorsView( {
                        model: new Backbone.Model(
                            _.extend( {
                                id: this.model.get( 'id' )
                            }, result )
                        )
                    } )
                );
        }
    } );


    /**
     * Job details view
     */
    Jobs.JobView = App.Common.TableView.extend( {
        template: '#job',
        className: '',
        templateHelpers: Jobs.templateHelpers,
        itemView: Jobs.TaskView,

        events: {
            'click .back-button': 'goBack'
        },

        initialize: function () {
            var that = this;

            this.collection = new Backbone.Collection();

            this.model.fetch().done( function () {
                that.collection.reset( that.model.get( 'tasks' ) );
            } );

            this.listenTo( this.model, 'change', this.render );
        },

        goBack: function () {
            App.back();
        }
    } );

    Jobs.TaskErrorsView = Backbone.Marionette.ItemView.extend( {
        template: '#task-errors',
        className: 'modal-content',

        onRender: function () {
            this.$el.wrap( '<div class="modal-dialog"></div>' );
            this.$el = this.$el.parent();
            this.setElement( this.$el );
        }
    } );

    Jobs.CreateJobView = Backbone.Marionette.ItemView.extend( {
        template: '#create-job',
        className: 'modal-dialog'
    } );

    /**
     * Controller for Jobs module
     * @type {Object}
     */
    Jobs.controller = {
        listJobs: function () {
            App.header.show( new Jobs.JobsHeaderView() );
            App.content.show( new Jobs.JobsListView( {
                collection: Jobs.jobsList
            } ) );
        },

        showJob: function ( id ) {
            App.header.close();
            App.content.show( new Jobs.JobView( {
                model: new Jobs.Job( {
                    id: id
                } )
            } ) );
        }
    };

    /**
     * Add Jobs module initializer
     */
    Jobs.addInitializer( function () {
        Jobs.router = new Jobs.Router( {
            controller: Jobs.controller
        } );

        Jobs.on( 'tests:list', function () {
            App.navigate( 'jobs' );
            Jobs.controller.listJobs();
        } );

    } );
} );
