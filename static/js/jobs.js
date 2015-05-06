/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

/**
 * @module Jobs
 */
App.module( 'Jobs', function( Jobs, App, Backbone ) {
	'use strict';

	/**
	 * Router for Jobs module
	 * @constructor module:Jobs.JobRouter
	 * @extends {Marionette.AppRouter}
	 */
	Jobs.JobRouter = Marionette.AppRouter.extend( /** @lends module:Jobs.JobRouter.prototype */ {
		/**
		 * Router name
		 * @default
		 * @type {String}
		 */
		name: 'jobs',

		/**
		 * Routes
		 * @default
		 * @type {Object}
		 */
		appRoutes: {
			'jobs': 'listJobs',
			'jobs/:id': 'showJob'
		}
	} );

	/**
	 * Job list row model
	 * @constructor module:Jobs.JobRow
	 * @extends {Backbone.Model}
	 */
	Jobs.JobRow = Backbone.Model.extend( /** @lends module:Jobs.JobRow.prototype */ {
		/**
		 * Default values
		 * @defualt
		 * @type {Object}
		 */
		defaults: {
			selected: false,
			description: '',
			created: 0,
			results: []
		},

		/**
		 * Mark a row as selected
		 * @param {Boolean} selected Is row selected
		 * @param {Boolean} silent   Change the selection without triggering 'change:selected' event
		 */
		setSelect: function( selected, silent ) {
			this.set( 'selected', !!selected, {
				silent: true
			} );

			if ( !silent ) {
				this.trigger( 'change:selected', !!selected );
			}

			this.trigger( 'toggle:selected', !!selected );
		}
	} );

	/**
	 * Job table row view
	 * @constructor module:Jobs.JobRowView
	 * @extends {Marionette.ItemView}
	 */
	Jobs.JobRowView = Marionette.ItemView.extend( /** @lends module:Jobs.JobRowView.prototype */ {
		/**
		 * Job row view class name
		 * @default
		 * @type {String}
		 */
		className: 'job',

		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#job-row',

		/**
		 * Job row view tag name
		 * @default
		 * @type {String}
		 */
		tagName: 'tr',

		/**
		 * Template helpers
		 * @type {module:Common.templateHelpers}
		 */
		templateHelpers: App.Common.templateHelpers,

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'change @ui.checkbox': 'changeSelected'
		},

		/**
		 * UI element binding
		 * @default
		 * @type {Object}
		 */
		ui: {
			checkbox: 'input[type=checkbox]'
		},

		/**
		 * Initialize a job row view
		 */
		initialize: function() {
			Marionette.ItemView.prototype.initialize.apply( this, arguments );

			this.listenTo( this.model, 'toggle:selected', this.updateSelected );
		},

		/**
		 * Set a model's selected property to the state of the checkbox
		 */
		changeSelected: function() {
			this.model.setSelect( this.ui.checkbox.prop( 'checked' ) );
		},

		/**
		 * Set the state of the checkbox
		 * @param {Boolean} selected Checkbox selected state
		 */
		updateSelected: function( selected ) {
			this.ui.checkbox.prop( 'checked', selected );
		}
	} );

	/**
	 * Job collection
	 * @constructor module:Jobs.JobList
	 * @extends {Backbone.Collection}
	 */
	Jobs.JobList = Backbone.Collection.extend(
		_.extend( {}, App.Common.DeferredFetchMixin, /** @lends module:Jobs.JobList.prototype */ {
			/**
			 * Collection model class
			 * @type {module:Jobs.JobRow}
			 */
			model: Jobs.JobRow,

			/**
			 * URL to the jobs API
			 * @default
			 * @type {String}
			 */
			url: '/jobs',

			/**
			 * Comparator function used to sort collection modles by creation dates
			 * @param  {Object} first  First model
			 * @param  {Object} second Secon model
			 * @return {Number}
			 */
			comparator: function( first, second ) {
				first = first.attributes.created;
				second = second.attributes.created;

				return first < second ? 1 :
					first > second ? -1 : 0;
			},

			/**
			 * Original fetch function, overriden by {@link module:Common.DeferredFetchMixin}
			 * @type {Function}
			 */
			oldFetch: Backbone.Collection.prototype.fetch,

			/**
			 * Parse a response and sort models
			 * @param  {Object} response Response object
			 * @return {Object}
			 */
			parse: function( response ) {
				return response.job.sort( function( first, second ) {
					first = first.created;
					second = second.created;

					return first < second ? 1 :
						first > second ? -1 : 0;
				} );
			},

			/**
			 * Set all models' selected state
			 * @param {Boolean} selected Selected state
			 */
			toggleSelectJobs: function( selected ) {
				this.each( function( item ) {
					item.setSelect( selected, true );
				} );
			}
		} )
	);


	/**
	 * Job collection
	 * @memberOf module:Jobs
	 * @type {module:Jobs.JobList}
	 * @name jobList
	 */
	Jobs.jobList = new Jobs.JobList();

	/**
	 * Empty jobs list view
	 * @constructor module:Jobs.NoJobsView
	 * @extends {Marionette.ItemView}
	 */
	Jobs.NoJobsView = Marionette.ItemView.extend( /** @lends module:Jobs.NoJobsView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#no-jobs',

		/**
		 * No jobs view tag name
		 * @default
		 * @type {String}
		 */
		tagName: 'tr'
	} );

	/**
	 * Header for the jobs list view
	 * @constructor module:Jobs.JobListHeaderView
	 * @extends {Marionette.ItemView}
	 */
	Jobs.JobListHeaderView = Marionette.ItemView.extend( /** @lends module:Jobs.JobListHeaderView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#job-list-header',

		/**
		 * Job list header view class name
		 * @default
		 * @type {String}
		 */
		className: 'row job-list-header',

		/**
		 * Template helpers
		 * @type {module:Common.templateHelpers}
		 */
		templateHelpers: App.Common.templateHelpers,

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'click @ui.removeButton': 'removeSelected'
		},

		/**
		 * UI elements binding
		 * @type {Object}
		 */
		ui: {
			removeButton: '.remove-selected-button'
		},

		/**
		 * Initialize the header view
		 */
		initialize: function() {
			this.listenTo( this.collection, 'toggle:selected', this.updateRemoveButton );
			this.listenTo( this.collection, 'sync', this.updateRemoveButton );
		},

		/**
		 * Remove selected jobs
		 */
		removeSelected: function() {
			Jobs.controller.removeSelectedJobs();
		},

		/**
		 * Update the state of the "remove selected" button
		 */
		updateRemoveButton: function() {
			var disabled = this.collection.every( function( item ) {
				return !item.get( 'selected' );
			} );

			this.ui.removeButton.prop( 'disabled', disabled );
		}
	} );

	/**
	 * Jobs list view
	 * @constructor module:Jobs.JobListView
	 * @extends {module:Common.TableView}
	 */
	Jobs.JobListView = App.Common.TableView.extend( /** @lends module:Jobs.JobListView.prototype */ {
		/**
		 * Template ID
		 * @default [value]
		 * @type {String}
		 */
		template: '#jobs',

		/**
		 * Child item view
		 * @type {module:Jobs.JobRowView}
		 */
		childView: Jobs.JobRowView,

		/**
		 * Empty list view
		 * @type {module:Jobs.NoJobsView}
		 */
		emptyView: Jobs.NoJobsView,

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'change @ui.selectAll': 'toggleSelectAllJobs'
		},

		/**
		 * UI element binding
		 * @default
		 * @type {Object}
		 */
		ui: {
			selectAll: '.select-all-jobs'
		},

		/**
		 * Initialize job list view
		 */
		initialize: function() {
			this.listenTo( this.collection, 'change', this.render );
			this.listenTo( this.collection, 'change:selected', this.updateSelectAllCheckbox );
			// TODO should we disable this on IE8?
			this.listenTo( Jobs.controller, 'job:update', _.bind( function() {
				this.collection.fetch();
			}, this ) );
		},

		appendHtml: function( collectionView, childView, index ) {
			var childrenContainer,
				children;

			if ( collectionView.isBuffering ) {
				collectionView._bufferedChildren.push( childView );
			}

			childrenContainer = collectionView.isBuffering ?
				$( collectionView.elBuffer ) :
				this.getChildViewContainer( collectionView );

			children = childrenContainer.children();

			if ( children.size() <= index ) {
				childrenContainer.append( childView.el );
			} else {
				children.eq( index ).before( childView.el );
			}
		},

		/**
		 * Toggle select all jobs
		 * @param {Object} e Change event
		 */
		toggleSelectAllJobs: function( e ) {
			this.collection.toggleSelectJobs( e.target.checked );
		},

		/**
		 * Update the "select all" checkbox state depending on the collection item selection.
		 * Check it if all of the items are selected, otherwise uncheck.
		 */
		updateSelectAllCheckbox: function() {
			var checked = this.collection.every( function( item ) {
				return item.get( 'selected' );
			} );

			this.ui.selectAll.prop( 'checked', checked );
		}
	} );

	/**
	 * Job details model
	 * @constructor module:Jobs.Job
	 * @extends {Backbone.Model}
	 */
	Jobs.Job = Backbone.Model.extend( _.extend( {}, App.Common.DeferredFetchMixin, /** @lends module:Jobs.Job.prototype */ {
		/**
		 * Default values
		 * @default
		 * @type {Object}
		 */
		defaults: {
			browsers: null,
			coverage: false,
			created: 0,
			done: false,
			description: '',
			filter: null,
			id: '',
			results: null,
			snapshot: false,
			tasks: null,
			tempBrowsers: null
		},

		/**
		 * Root URL for job requests
		 * @default
		 * @type {String}
		 */
		urlRoot: '/jobs/',

		/**
		 * Original fetch function overriden by {@link module:Common.DefferedFetchMixin}
		 * @type {Function}
		 */
		oldFetch: Backbone.Model.prototype.fetch,

		/**
		 * Initialize a model
		 */
		initialize: function() {
			this.set( {
				browsers: [],
				filter: [],
				results: [],
				tasks: [],
				tempBrowsers: []
			} );

			App.Common.DeferredFetchMixin.initialize.apply( this, arguments );
		},

		/**
		 * Validate a model, mark it as invalid if there are no browsers defined
		 * @param  {Object} attrs Model attributes
		 * @return {String}
		 */
		validate: function( attrs ) {
			if ( !attrs.browsers.length ) {
				return 'No browsers specified for the job';
			}
		}
	} ) );

	/**
	 * Task row view
	 * @constructor module:Jobs.TaskView
	 * @extends {Marionette.ItemView}
	 */
	Jobs.TaskView = Marionette.ItemView.extend( /** @lends module:Jobs.TaskView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#task',

		/**
		 * Task view tag name
		 * @default
		 * @type {String}
		 */
		tagName: 'tr',

		/**
		 * Task view class name
		 * @default
		 * @type {String}
		 */
		className: 'task',

		/**
		 * Template helpers
		 * @type {module:Common.templateHelpers}
		 */
		templateHelpers: App.Common.templateHelpers,

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'click .clickable': 'showError'
		},

		/**
		 * Initialize a task view
		 */
		initialize: function() {
			if ( this.model.get( 'failed' ) ) {
				this.$el.addClass( 'failed' );
			}
		},

		/**
		 * Show task result error details
		 * @param {Object} event Click event
		 */
		showError: function( event ) {
			var $elem = $( event.currentTarget ),
				result = this.model.get( 'results' )[ $elem.index() ];

			if ( result && result.errors ) {
				Jobs.controller.showError( new Backbone.Model(
					_.extend( {
						id: this.model.get( 'id' )
					}, result )
				) );
			}
		}
	} );

	/**
	 * Job header view
	 * @constructor module:Jobs.JobHeaderView
	 * @extends {Marionette.ItemView}
	 */
	Jobs.JobHeaderView = Marionette.ItemView.extend( /** @lends module:Jobs.JobHeaderView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#job-header',

		/**
		 * Template helpers
		 * @type {module:Common.templateHelpers}
		 */
		templateHelpers: App.Common.templateHelpers,

		/**
		 * UI element binding
		 * @default
		 * @type {Object}
		 */
		ui: {
			'all': '.check-all',
			'failed': '.check-failed'
		},

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'click .remove-button': 'removeJob',
			'click .restart-button': 'restartJob',
			'click .edit-button': 'editJob',
			'change @ui.all, @ui.failed': 'filterFailed'
		},

		/**
		 * Initialize a job header view
		 */
		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
			this.model.set( 'onlyFailed', false, {
				silent: true
			} );
		},

		/**
		 * Handle render event
		 */
		onRender: function() {
			/**
			 * Header was resized
			 * @event module:App#header:resize
			 * @type {Number}
			 */
			App.trigger( 'header:resize' );
		},

		/**
		 * Remove a job
		 */
		removeJob: function() {
			Jobs.controller.removeJob( this.model );
		},

		/**
		 * Restart a job
		 */
		restartJob: function() {
			Jobs.controller.restartJob( this.model );
		},

		/**
		 * Edit a job
		 */
		editJob: function() {
			App.modal.show(
				new Jobs.EditJobView( {
					model: this.model
				} )
			);
		},

		/**
		 * Filter results to toggle show failed tests only
		 */
		filterFailed: function() {
			if ( this.ui.all.is( ':checked' ) ) {
				this.model.set( 'onlyFailed', false, {
					silent: true
				} );
				$( '.jobs' ).removeClass( 'only-failed' );
			} else if ( this.ui.failed.is( ':checked' ) ) {
				this.model.set( 'onlyFailed', true, {
					silent: true
				} );
				$( '.jobs' ).addClass( 'only-failed' );
			}
		}
	} );

	/**
	 * Job details view
	 * @constructor module:Jobs.JobView
	 * @extends {module:Common.TableView}
	 */
	Jobs.JobView = App.Common.TableView.extend( /** @lends module:Jobs.JobView */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#job',

		/**
		 * Job view class name
		 * @default
		 * @type {String}
		 */
		className: 'panel panel-default',

		/**
		 * Template helpers
		 * @type {module:Common.templateHelpers}
		 */
		templateHelpers: App.Common.templateHelpers,

		/**
		 * Job task view
		 * @type {module:Jobs.TaskView}
		 */
		childView: Jobs.TaskView,

		/**
		 * Initialize a job view
		 */
		initialize: function() {
			this.collection = new Backbone.Collection();

			this.listenTo( this.model, 'change', this.update );
			this.listenTo( this.model, 'error', App.show404 );
			// TODO should we disable this on IE8?
			this.listenTo( Jobs.controller, 'job:update', function( jobId ) {
				if ( jobId === this.model.id ) {
					this.model.fetch();
				}
			} );

			this.update();
		},

		/**
		 * Update a job view
		 */
		update: function() {
			this.collection.reset( this.model.get( 'tasks' ) );
			this.render();
			/**
			 * Header was updated
			 * @event module:App#header:update
			 * @type {Boolean}
			 */
			App.trigger( 'header:update', true );
		}
	} );

	/**
	 * Edit job view
	 * @constructor module:Jobs.EditJobView
	 * @extends {module:Common.ModalView}
	 */
	Jobs.EditJobView = App.Common.ModalView.extend( /** @lends module:Jobs.EditJobView */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#edit-job',

		/**
		 * UI element binding
		 * @default
		 * @type {Object}
		 */
		ui: {
			'browsers': '.job-browsers',
			'description': '.job-description',
			'save': '.save-button'
		},

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'change @ui.browsers': 'updateBrowsers',
			'click @ui.save': 'saveJob',
			'click .add-captured-button': 'addCaptured',
			'click .add-all-button': 'addAll'
		},

		/**
		 * Template helpers
		 * @type {Object}
		 */
		templateHelpers: {
			findBrowser: function( browsers, browser ) {
				return _.indexOf( _.map( browsers, function( browser ) {
					return browser.toLowerCase();
				} ), browser.toLowerCase() ) > -1;
			}
		},

		/**
		 * Initialize an edit job view
		 */
		initialize: function() {
			this.listenTo( this.model, 'invalid', this.showError );
			this.listenTo( this.model, 'sync', this.handleSave );

			this.model.set( 'tempBrowsers', this.model.get( 'browsers' ).slice(), {
				silent: true
			} );
		},

		/**
		 * Handle render event
		 */
		onRender: function() {
			App.Common.ModalView.prototype.onRender.apply( this, arguments );

			this.ui.browsers.chosen( {
				width: '100%'
			} );
		},

		/**
		 * Update list of selected browsers of an edited job
		 * @param {Object} event  Input change event
		 * @param {Object} params Event params
		 */
		updateBrowsers: function( event, params ) {
			var browsers = this.model.get( 'tempBrowsers' ),
				idx;

			if ( params.selected ) {
				browsers.push( params.selected.toLowerCase() );
			} else if ( params.deselected &&
				( idx = _.indexOf( browsers, params.deselected.toLowerCase() ) ) > -1 ) {
				browsers.splice( idx, 1 );
			}

			this.model.set( 'tempBrowsers', browsers, {
				silent: true
			} );
		},

		/**
		 * Add all captured browsers to a job
		 */
		addCaptured: function() {
			var current = this.model.get( 'tempBrowsers' ) || [],
				that = this,
				captured = [],
				toAdd;

			App.Browsers.browserList.each( function( browser ) {
				var clients = browser.get( 'clients' );

				if ( clients && clients.length ) {
					captured.push( browser.id.toLowerCase() );
				}
			} );

			toAdd = _.uniq( current.concat( captured ) );

			this.model.set( 'tempBrowsers', toAdd, {
				silent: true
			} );

			_.each( toAdd, function( id ) {
				that.ui.browsers.find( 'option[value="' + id + '"]' ).attr( 'selected', true );
			} );

			this.ui.browsers.trigger( 'chosen:updated' );
		},

		/**
		 * Add all browsers to a job
		 */
		addAll: function() {
			var that = this,
				browsers = [];

			App.Browsers.browserList.each( function( browser ) {
				if ( browser.attributes.header && browser.id !== 'Unknown' ) {
					browsers.push( browser.id.toLowerCase() );
				}
			} );

			this.model.set( 'tempBrowsers', browsers, {
				silent: true
			} );

			_.each( browsers, function( id ) {
				that.ui.browsers.find( 'option[value="' + id + '"]' ).attr( 'selected', true );
			} );

			this.ui.browsers.trigger( 'chosen:updated' );
		},

		/**
		 * Show an error if a model is invalid
		 * @param {Object} model Validated model
		 * @param {String} error Error message
		 */
		showError: function( model, error ) {
			this.ui.save.prop( 'disabled', false );
			App.Alerts.controller.add( 'danger', error, 'Error:' );
		},

		/**
		 * Handle job save
		 */
		handleSave: function() {
			App.Alerts.controller.add(
				'success',
				'Job saved.',
				'Success!'
			);

			this.ui.save.prop( 'disabled', false );
			this.destroy();
			this.model.fetch( {
				force: true
			} );
		},

		/**
		 * Save changes to a job
		 */
		saveJob: function() {
			var description = this.ui.description.val().replace( /^\s+|\s+$/g, '' );

			this.ui.save.prop( 'disabled', true );

			this.model
				.set( 'browsers', this.model.get( 'tempBrowsers' ) )
				.set( 'description', description )
				.save();
		}
	} );

	/**
	 * Controller for Jobs module
	 * @constructor module:Jobs.Controller
	 * @extends {Marionette.Controller}
	 */
	Jobs.Controller = Marionette.Controller.extend( /** @lends module:Jobs.Controller.prototype */ {
		/**
		 * Initialize a controller
		 */
		initialize: function() {
			App.Sockets.socket.on( 'job:update', _.bind( function( jobId ) {
				/**
				 * Job has been updated
				 * @event module:Jobs.Controller#job:update
				 * @type {String}
				 */
				this.trigger( 'job:update', jobId );
			}, this ) );
		},

		/**
		 * List all jobs
		 */
		listJobs: function() {
			App.header.show( new Jobs.JobListHeaderView( {
				collection: Jobs.jobList
			} ) );

			App.content.show( new Jobs.JobListView( {
				collection: Jobs.jobList
			} ) );

			Jobs.jobList.fetch( {
				reset: true,
				force: true
			} );
		},

		/**
		 * Remove the given job
		 * @param {Object} job Job model
		 */
		removeJob: function( job ) {
			App.showConfirmPopup( {
				message: 'Do you want to remove this job?',
				callback: remove
			} );

			function remove( callback ) {
				job.destroy( {
					success: function( model, response ) {
						App.Alerts.controller.add(
							response.success ? 'success' : 'danger',
							response.success ?
							'Removed a job: <strong>' + response.id + '</strong>' :
							response.error,
							response.success ? 'Success!' : 'Error!'
						);
						callback( true );
						App.navigate( 'jobs' );
					},
					error: function( model, response ) {
						App.Alerts.controller.add(
							'danger',
							response.responseText || 'Error while removing a job.',
							'Error!'
						);
						callback( false );
					}
				} );
			}
		},

		/**
		 * Restart the given job
		 * @param {Object} job Job model
		 */
		restartJob: function( job ) {
			App.showConfirmPopup( {
				message: 'Do you want to restart this job?',
				callback: restart
			} );

			function restart( callback ) {
				$.ajax( {
					url: '/jobs/' + job.id + '/restart',
					dataType: 'json',
					success: function( response ) {
						App.Alerts.controller.add(
							response.success ? 'success' : 'danger',
							response.success ?
							'Restarted a job: <strong>' + response.id + '</strong>' :
							response.error,
							response.success ? 'Success!' : 'Error!'
						);

						if ( response.success ) {
							job.fetch( {
								force: true
							} );
						}

						callback( !!response.success );
					},
					error: function( response, status ) {
						App.Alerts.controller.add(
							'danger',
							status || 'Error while restarting a job.',
							'Error!'
						);

						callback( false );
					}
				} );
			}
		},

		/**
		 * Remove selected jobs
		 */
		removeSelectedJobs: function() {
			var selected = Jobs.jobList.filter( function( item ) {
				return item.get( 'selected' );
			} ).map( function( item ) {
				return item.get( 'id' );
			} );

			if ( !selected.length ) {
				return;
			}

			App.showConfirmPopup( {
				message: 'Do you want to remove selected jobs?',
				callback: remove
			} );

			function remove( callback ) {
				$.ajax( {
					url: 'jobs/' + selected.join( ',' ),
					type: 'DELETE',
					success: function( response ) {
						App.Alerts.controller.add(
							response.success ? 'success' : 'danger',
							response.success ?
							'Removed jobs: <strong>' + selected.join( ', ' ) + '</strong>' :
							response.error,
							response.success ? 'Success!' : 'Error!'
						);

						Jobs.jobList.fetch( {
							force: true
						} );

						callback( true );
					},

					error: function( response ) {
						App.Alerts.controller.add(
							'danger',
							response.responseText || 'Error while removing jobs.',
							'Error!'
						);
						callback( false );
					}
				} );
			}
		},

		/**
		 * Show test error details
		 * @param {Object} result Test result
		 */
		showError: function( result ) {
			App.modal.show(
				new App.Common.TestErrorsView( {
					model: result
				} )
			);
		},

		/**
		 * Display job details
		 * @param {String} id Job ID
		 */
		showJob: function( id ) {
			var job = new Jobs.Job( {
				id: id
			} );

			job.fetch( {
					reset: true
				} )
				.error( function() {
					App.show404();
				} )
				.done( function() {
					App.header.show( new Jobs.JobHeaderView( {
						model: job
					} ) );

					App.content.show( new Jobs.JobView( {
						model: job
					} ) );
				} );
		}
	} );

	/**
	 * Add Jobs module initializer
	 */
	Jobs.addInitializer( function() {
		/**
		 * Job controller
		 * @memberOf module:Jobs
		 * @type {module:Jobs.Controller}
		 * @name controller
		 */
		Jobs.controller = new Jobs.Controller();

		/**
		 * Job router
		 * @memberOf module:Jobs
		 * @type {module:Jobs.JobRouter}
		 * @name jobRouter
		 */
		Jobs.jobRouter = new Jobs.JobRouter( {
			controller: Jobs.controller
		} );
	} );
} );
