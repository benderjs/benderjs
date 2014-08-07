/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @module App.Jobs
 */

App.module( 'Jobs', function( Jobs, App, Backbone ) {
	'use strict';

	Jobs.templateHelpers = {
		// build browser object from a string
		prepareBrowser: function( browser ) {
			var match = /^([a-z]+)(\d*)/i.exec( browser );

			return match ? {
				name: match[ 1 ].toLowerCase(),
				version: parseInt( match[ 2 ], 10 ) || 0
			} : browser;
		},

		getBrowsers: function( browsers ) {
			return _.map( browsers, function( browser ) {
				return browser.name + ( browser.version || '' );
			} ).join( ' ' );
		},

		findBrowser: function( browsers, browser ) {
			return _.indexOf( _.map( browsers, function( browser ) {
				return browser.toLowerCase();
			} ), browser.toLowerCase() ) > -1;
		}
	};

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
	Jobs.JobRowView = Marionette.ItemView.extend( {
		template: '#job-row',
		tagName: 'tr',
		templateHelpers: App.Common.templateHelpers
	} );

	/**
	 * Job collection
	 */
	Jobs.jobsList = new( Backbone.Collection.extend(
		_.extend( {}, App.Common.DeferredFetchMixin, {
			model: Jobs.JobRow,
			url: '/jobs',

			comparator: function( first, second ) {
				first = first.attributes.created;
				second = second.attributes.created;

				return first < second ? 1 :
					first > second ? -1 : 0;
			},

			oldFetch: Backbone.Collection.prototype.fetch,

			parse: function( response ) {
				return response.job.sort( function( first, second ) {
					first = first.created;
					second = second.created;

					return first < second ? 1 :
						first > second ? -1 : 0;
				} );
			}
		} )
	) )();

	/**
	 * Empty jobs list view
	 */
	Jobs.NoJobsView = Marionette.ItemView.extend( {
		template: '#no-jobs',
		tagName: 'tr'
	} );

	/**
	 * Jobs list view
	 */
	Jobs.JobsListView = App.Common.TableView.extend( {
		template: '#jobs',
		childView: Jobs.JobRowView,
		emptyView: Jobs.NoJobsView,

		initialize: function() {
			this.listenTo( this.collection, 'change', this.render );
			// TODO should we disable this on IE8?
			this.listenTo( Jobs.controller, 'job:update', _.bind( function() {
				this.collection.fetch();
			}, this ) );

			this.collection.fetch( {
				reset: true,
				force: true
			} );
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
		}
	} );

	/**
	 * Job details model
	 */
	Jobs.Job = Backbone.Model.extend( _.extend( {}, App.Common.DeferredFetchMixin, {
		defaults: {
			id: '',
			description: '',
			created: 0,
			tempBrowsers: null,
			browsers: null,
			filter: null,
			tasks: null
		},

		urlRoot: '/jobs/',

		oldFetch: Backbone.Model.prototype.fetch,

		initialize: function() {
			this
				.set( 'browsers', [] )
				.set( 'filter', [] )
				.set( 'tasks', [] );
		},

		validate: function( attrs ) {
			if ( !attrs.browsers.length ) {
				return 'No browsers specified for the job';
			}
		}
	} ) );

	/**
	 * Task row view
	 */
	Jobs.TaskView = Marionette.ItemView.extend( {
		template: '#task',
		tagName: 'tr',
		templateHelpers: App.Common.templateHelpers,

		events: {
			'click .clickable': 'showError'
		},

		showError: function( event ) {
			var $elem = $( event.currentTarget ),
				result = this.model.get( 'results' )[ $elem.index() ];

			if ( result && result.errors ) {
				App.modal.show(
					new App.Common.TestErrorsView( {
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

	Jobs.JobHeaderView = Marionette.ItemView.extend( {
		template: '#job-header',
		templateHelpers: _.extend( {}, Jobs.templateHelpers, App.Common.templateHelpers ),

		events: {
			'click .remove-button': 'removeJob',
			'click .restart-button': 'restartJob',
			'click .edit-button': 'editJob',
		},

		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
		},

		onRender: function() {
			App.$body.css( 'paddingTop', App.$navbar.height() + 1 + 'px' );
		},

		removeJob: function() {
			var that = this;

			function remove( callback ) {
				that.model.destroy( {
					success: function( model, response ) {
						App.Alerts.Manager.add(
							response.success ? 'success' : 'danger',
							response.success ?
							'Removed a job: <strong>' + response.id + '</strong>' :
							response.error,
							response.success ? 'Success!' : 'Error!'
						);
						callback( true );
						App.back();
					},
					error: function( model, response ) {
						App.Alerts.Manager.add(
							'danger',
							response.error || 'Error while removing a job.',
							'Error!'
						);
						callback( false );
					}
				} );
			}

			App.showConfirmPopup( {
				message: 'Do you want to remove this job?',
				callback: remove
			} );
		},

		restartJob: function() {
			var that = this;

			function restart( callback ) {
				$.ajax( {
					url: '/jobs/' + that.model.id + '/restart',
					dataType: 'json',
					success: function( response ) {
						App.Alerts.Manager.add(
							response.success ? 'success' : 'danger',
							response.success ?
							'Restarted a job: <strong>' + response.id + '</strong>' :
							response.error,
							response.success ? 'Success!' : 'Error!'
						);

						if ( response.success ) {
							that.model.fetch( {
								force: true
							} );
						}

						callback( !!response.success );
					},
					error: function( response, status ) {
						App.Alerts.Manager.add(
							'danger',
							status || 'Error while restarting a job.',
							'Error!'
						);

						callback( false );
					}
				} );
			}

			App.showConfirmPopup( {
				message: 'Do you want to restart this job?',
				callback: restart
			} );
		},

		editJob: function() {
			App.modal.show(
				new Jobs.EditJobView( {
					model: this.model
				} )
			);
		}
	} );

	/**
	 * Job details view
	 */
	Jobs.JobView = App.Common.TableView.extend( {
		template: '#job',
		className: 'panel panel-default',
		templateHelpers: _.extend( {}, Jobs.templateHelpers, App.Common.templateHelpers ),
		childView: Jobs.TaskView,

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

			this.model.fetch( {
				reset: true
			} );
		},

		update: function() {
			this.collection.reset( this.model.get( 'tasks' ) );
			this.render();
		}
	} );

	/**
	 * Edit job view
	 */
	Jobs.EditJobView = App.Common.ModalView.extend( {
		template: '#edit-job',

		ui: {
			'browsers': '.job-browsers',
			'description': '.job-description',
			'save': '.save-button'
		},

		events: {
			'change @ui.browsers': 'updateBrowsers',
			'click @ui.save': 'saveJob',
			'click .add-captured-button': 'addCaptured',
			'click .add-all-button': 'addAll'
		},

		templateHelpers: Jobs.templateHelpers,

		initialize: function() {
			this.listenTo( this.model, 'invalid', this.showError );
			this.listenTo( this.model, 'sync', this.handleSave );

			this.model.set( 'tempBrowsers', [].concat( this.model.get( 'browsers' ) ), {
				silent: true
			} );
		},

		onRender: function() {
			App.Common.ModalView.prototype.onRender.apply( this, arguments );

			this.ui.browsers.chosen( {
				width: '100%'
			} );
		},

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

		addCaptured: function() {
			var current = this.model.get( 'tempBrowsers' ) || [],
				that = this,
				captured = [],
				toAdd;

			App.Browsers.browsersList.each( function( browser ) {
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

		addAll: function() {
			var that = this,
				browsers = [];

			App.Browsers.browsersList.each( function( browser ) {
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

		showError: function( model, error ) {
			this.ui.save.prop( 'disabled', false );
			App.Alerts.Manager.add( 'danger', error, 'Error:' );
		},

		handleSave: function() {
			App.Alerts.Manager.add(
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
	 * @type {Object}
	 */
	Jobs.Controller = Marionette.Controller.extend( {
		initialize: function() {
			App.Sockets.socket.on( 'job:update', _.bind( function( jobId ) {
				this.trigger( 'job:update', jobId );
			}, this ) );
		},

		listJobs: function() {
			App.header.empty();
			App.content.show( new Jobs.JobsListView( {
				collection: Jobs.jobsList
			} ) );
		},

		showJob: function( id ) {
			var job = new Jobs.Job( {
				id: id
			} );

			// App.header.empty();

			App.header.show( new Jobs.JobHeaderView( {
				model: job
			} ) );

			App.content.show( new Jobs.JobView( {
				model: job
			} ) );
		}
	} );

	/**
	 * Add Jobs module initializer
	 */
	Jobs.addInitializer( function() {
		Jobs.controller = new Jobs.Controller();

		Jobs.router = new Jobs.Router( {
			controller: Jobs.controller
		} );
	} );
} );
