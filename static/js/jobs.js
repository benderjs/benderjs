App.module( 'Jobs', function( Jobs, App, Backbone ) {

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
		getTime: function( timestamp ) {
			return moment( timestamp ).fromNow();
		},

		getResultStyle: function( result ) {
			var status = result.status === 2 ? 'success' :
				result.status === 3 ? 'danger' : 'info';

			return status + ' bg-' + status + ' text-' + status;
		},

		getIcon: function( result ) {
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

		comparator: function( first, second ) {
			first = first.attributes.created;
			second = second.attributes.created;

			return first < second ? 1 :
				first > second ? -1 : 0;
		},

		parse: function( response ) {
			return response.job.sort( function( first, second ) {
				first = first.created;
				second = second.created;

				return first < second ? 1 :
					first > second ? -1 : 0;
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
			'click @ui.create': 'showCreateJob'
		},

		showCreateJob: function() {
			App.modal.show(
				new Jobs.CreateJobView( {
					model: new Jobs.NewJob()
				} )
			);
		}
	} );

	/**
	 * Jobs list view
	 */
	Jobs.JobsListView = App.Common.TableView.extend( {
		template: '#jobs',
		itemView: Jobs.JobRowView,
		emptyView: Jobs.NoJobsView,

		initialize: function() {
			this.collection.fetch();
		},

		appendHtml: function( collectionView, itemView, index ) {
			var childrenContainer,
				children;

			if ( collectionView.isBuffering ) {
				collectionView._bufferedChildren.push( itemView );
			}

			childrenContainer = collectionView.isBuffering ?
				$( collectionView.elBuffer ) :
				this.getItemViewContainer( collectionView );

			children = childrenContainer.children();

			if ( children.size() <= index ) {
				childrenContainer.append( itemView.el );
			} else {
				children.eq( index ).before( itemView.el );
			}
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

		parse: function( data ) {
			data.browsers = _.map( data.tasks[ 0 ].results, function( result ) {
				return {
					name: result.name,
					version: result.version
				};
			} );

			return data;
		}
	} );

	/**
	 * New job model
	 */
	Jobs.NewJob = Backbone.Model.extend( {
		defaults: {
			browsers: [],
			description: '',
			tests: []
		},

		initialize: function() {
			this.set( 'tests', App.Tests.testsList.getIds() );
			// this.set(
			//     'browsers',
			//     App.Browsers.browsersList.map( function ( browser ) {
			//         return browser.get( 'id' );
			//     } )
			// );
		},

		validate: function( attrs ) {
			if ( !attrs.browsers.length ) {
				return 'no browsers specified';
			}
			if ( !attrs.tests.length ) {
				return 'no tests specified';
			}
		},

		urlRoot: '/jobs'
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

		showError: function( event ) {
			var elem = $( event.currentTarget ),
				result = this.model.get( 'results' )[ elem.index() ];

			if ( result && result.errors ) {
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

		initialize: function() {
			var that = this;

			this.collection = new Backbone.Collection();

			this.model.fetch().done( function() {
				that.collection.reset( that.model.get( 'tasks' ) );
			} );

			this.listenTo( this.model, 'change', this.render );
		},

		goBack: function() {
			App.back();
		}
	} );

	/**
	 * Task errors view
	 */
	Jobs.TaskErrorsView = App.Common.ModalView.extend( {
		template: '#task-errors'
	} );

	/**
	 * Create a job view
	 */
	Jobs.CreateJobView = App.Common.ModalView.extend( {
		template: '#create-job',

		ui: {
			'browsers': '.job-browsers',
			'description': '.job-description'
		},

		events: {
			'change .job-browsers': 'updateBrowsers',
			'click .dropdown-menu a': 'addBrowser',
			'click .create-button': 'createJob'
		},

		initialize: function() {
			this.listenTo( this.model, 'change', this.updateUI );
			this.listenTo( this.model, 'invalid', this.showError );
			this.listenTo( this.model, 'sync', this.handleCreate );
		},

		updateUI: function() {
			var model = this.model.toJSON();

			this.ui.browsers.val( model.browsers.join( ' ' ) );
			this.ui.description.val( model.description );
		},

		showError: function( model, error ) {
			// TODO show notification
			console.log( 'invalid job -', error );
		},

		handleCreate: function() {
			this.close();
			Jobs.jobsList.fetch();
		},

		updateBrowsers: function() {
			var browsers = $( event.target ).val().split( /\s+/ );

			this.model.set( 'browsers', _.uniq( browsers ) );
		},

		addBrowser: function() {
			var name = $( event.target ).text(),
				browsers = this.model.get( 'browsers' );

			if ( browsers.indexOf( name ) === -1 ) {
				browsers = browsers.concat( name );
				this.model.set( 'browsers', browsers );
			}
		},

		createJob: function() {
			var that = this;

			if ( !this.model.get( 'tests' ).length ) {
				App.Tests.testsList.fetch( {
					success: function() {
						that.model.set( 'tests', App.Tests.testsList.getIds() );
						that.model.save();
					}
				} );
			} else {
				this.model.save();
			}
		}
	} );

	/**
	 * Controller for Jobs module
	 * @type {Object}
	 */
	Jobs.controller = {
		listJobs: function() {
			App.header.show( new Jobs.JobsHeaderView() );
			App.content.show( new Jobs.JobsListView( {
				collection: Jobs.jobsList
			} ) );
		},

		showJob: function( id ) {
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
	Jobs.addInitializer( function() {
		Jobs.router = new Jobs.Router( {
			controller: Jobs.controller
		} );

		Jobs.on( 'tests:list', function() {
			App.navigate( 'jobs' );
			Jobs.controller.listJobs();
		} );

	} );
} );
