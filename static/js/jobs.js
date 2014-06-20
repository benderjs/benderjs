/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @module App.Jobs
 */

App.module( 'Jobs', function( Jobs, App, Backbone ) {
	'use strict';

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
	Jobs.JobRowView = Backbone.Marionette.ItemView.extend( {
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
	Jobs.NoJobsView = Backbone.Marionette.ItemView.extend( {
		template: '#no-jobs',
		tagName: 'tr'
	} );

	/**
	 * Jobs list view
	 */
	Jobs.JobsListView = App.Common.TableView.extend( {
		template: '#jobs',
		itemView: Jobs.JobRowView,
		emptyView: Jobs.NoJobsView,

		initialize: function() {
			this.listenTo( this.collection, 'change', this.render );
			this.listenTo( Jobs.controller, 'job:update', _.bind( function() {
				this.collection.fetch();
			}, this ) );

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
	 * Job details model
	 */
	Jobs.Job = Backbone.Model.extend( _.extend( {}, App.Common.DeferredFetchMixin, {
		defaults: {
			id: '',
			description: '',
			created: 0,
			browsers: [],
			filter: [],
			tasks: []
		},

		urlRoot: '/jobs/',

		oldFetch: Backbone.Model.prototype.fetch,

		validate: function( attrs ) {
			if ( !attrs.browsers.length ) {
				return 'No browsers specified for the job';
			}
		}
	} ) );

	/**
	 * Task row view
	 */
	Jobs.TaskView = Backbone.Marionette.ItemView.extend( {
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

	/**
	 * Job details view
	 */
	Jobs.JobView = App.Common.TableView.extend( {
		template: '#job',
		className: '',
		templateHelpers: App.Common.templateHelpers,
		itemView: Jobs.TaskView,

		events: {
			'click .back-button': 'goBack',
			'click .remove-button': 'removeJob',
			'click .restart-button': 'restartJob',
			'click .edit-button': 'editJob',
		},

		initialize: function() {
			this.collection = new Backbone.Collection();

			this.listenTo( this.model, 'change', this.update );
			this.listenTo( this.model, 'error', App.show404 );
			this.listenTo( Jobs.controller, 'job:update', function( jobId ) {
				if ( jobId === this.model.id ) {
					this.model.fetch();
				}
			} );

			this.model.fetch();
		},

		update: function() {
			this.collection.reset( this.model.get( 'tasks' ) );
			this.render();
		},

		goBack: function() {
			App.back();
		},

		removeJob: function() {
			var that = this;

			function remove() {
				that.model.destroy( {
					success: function( model, response ) {
						App.Alerts.Manager.add(
							response.success ? 'success' : 'danger',
							response.success ?
							'Removed a job: <strong>' + response.id + '</strong>' :
							response.error,
							response.success ? 'Success!' : 'Error!'
						);
						App.back();
					},
					error: function( model, response ) {
						App.Alerts.Manager.add(
							'danger',
							response.error || 'Error while removing a job.',
							'Error!'
						);
					}
				} );
			}

			App.showConfirm( {
				message: 'Do you want to remove this job?',
				callback: remove
			} );
		},

		restartJob: function() {
			var that = this;

			function restart() {
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
					},
					error: function( response, status ) {
						App.Alerts.Manager.add(
							'danger',
							status || 'Error while restarting a job.',
							'Error!'
						);
					}
				} );
			}

			App.showConfirm( {
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
			'click .dropdown-menu a': 'addBrowser',
			'click @ui.save': 'saveJob',
			'click .add-captured-button': 'addCaptured'
		},

		templateHelpers: {
			getBrowsers: function( browsers ) {
				return _.map( browsers, function( browser ) {
					return browser.name + ( browser.version || '' );
				} ).join( ' ' );
			}
		},

		initialize: function() {
			this.listenTo( this.model, 'invalid', this.showError );
			this.listenTo( this.model, 'sync', this.handleSave );
		},

		getBrowsersArray: function() {
			return _.compact( this.ui.browsers.val().replace( /^\s+|\s+$/g, '' ).split( /\s+/ ) );
		},

		addBrowser: function( event ) {
			var browsers = this.getBrowsersArray(),
				name = $( event.target ).text().replace( /^\s+|\s+$/g, '' ),
				pattern = new RegExp( '(?:^|,)' + name + '(?:,|$)', 'i' );

			if ( name && !pattern.test( browsers.join( ',' ) ) ) {
				browsers = browsers.concat( name );

				this.ui.browsers.val( browsers.join( ' ' ) );
			}
		},

		addCaptured: function() {
			var current = this.getBrowsersArray(),
				captured = [];

			App.Browsers.browsersList.each( function( browser ) {
				var clients = browser.get( 'clients' );

				if ( clients && clients.length ) {
					captured.push( browser.id );
				}
			} );

			// add captured browsers omitting those already included
			function addBrowsers() {
				var currentLower = _.map( current, function( browser ) {
						return browser.toLowerCase();
					} ),
					result = [].concat( current );

				_.each( captured, function( browser ) {
					if ( currentLower.indexOf( browser.toLowerCase() ) === -1 ) {
						result.push( browser );
					}
				} );

				return result;
			}

			this.ui.browsers.val( ( current.length ? addBrowsers() : captured ).join( ' ' ) );
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
			this.close();
			this.model.fetch( {
				force: true
			} );
		},

		saveJob: function() {
			var browsers = this.getBrowsersArray(),
				description = this.ui.description.val().replace( /^\s+|\s+$/g, '' );

			// build browser object from a string
			function prepareBrowser( browser ) {
				var match = /^([a-z]+)(\d*)/i.exec( browser );

				return match ? {
					name: match[ 1 ].toLowerCase(),
					version: match[ 2 ] || 0
				} : browser;
			}

			this.ui.save.prop( 'disabled', true );

			this.model
				.set( 'browsers', _.map( _.uniq( browsers ), prepareBrowser ) )
				.set( 'description', description )
				.save();
		}
	} );

	/**
	 * Controller for Jobs module
	 * @type {Object}
	 */
	Jobs.Controller = Backbone.Marionette.Controller.extend( {
		initialize: function() {
			App.Sockets.socket.on( 'job:update', _.bind( function( jobId ) {
				this.trigger( 'job:update', jobId );
			}, this ) );
		},

		listJobs: function() {
			App.header.close();
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
