/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
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
			selected: false,
			description: '',
			created: 0,
			results: []
		},

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
	 */
	Jobs.JobRowView = Marionette.ItemView.extend( {
		template: '#job-row',
		tagName: 'tr',
		templateHelpers: App.Common.templateHelpers,

		events: {
			'change @ui.checkbox': 'changeSelected'
		},

		ui: {
			checkbox: 'input[type=checkbox]'
		},

		initialize: function() {
			Marionette.ItemView.prototype.initialize.apply( this, arguments );

			this.listenTo( this.model, 'toggle:selected', this.updateSelected );
		},

		changeSelected: function() {
			this.model.setSelect( this.ui.checkbox.prop( 'checked' ) );
		},

		updateSelected: function( selected ) {
			this.ui.checkbox.prop( 'checked', selected );
		}
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
			},

			toggleSelectJobs: function( selected ) {
				this.each( function( item ) {
					item.setSelect( selected, true );
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
	 * Header for the jobs list view
	 */
	Jobs.JobsListHeaderView = Marionette.ItemView.extend( {
		template: '#job-list-header',
		className: 'row job-list-header',
		templateHelpers: App.Common.templateHelpers,

		events: {
			'click @ui.removeButton': 'removeSelected'
		},

		ui: {
			removeButton: '.remove-selected-button'
		},

		initialize: function() {
			this.listenTo( this.collection, 'toggle:selected', this.updateRemoveButton );
			this.listenTo( this.collection, 'sync', this.updateRemoveButton );
		},

		removeSelected: function() {
			var selected = this.collection.filter( function( item ) {
					return item.get( 'selected' );
				} ).map( function( item ) {
					return item.get( 'id' );
				} ),
				that = this;

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
						App.Alerts.Manager.add(
							response.success ? 'success' : 'danger',
							response.success ?
							'Removed jobs: <strong>' + selected.join( ', ' ) + '</strong>' :
							response.error,
							response.success ? 'Success!' : 'Error!'
						);

						that.collection.fetch( {
							force: true
						} );

						callback( true );
					},

					error: function( response ) {
						App.Alerts.Manager.add(
							'danger',
							response.responseText || 'Error while removing jobs.',
							'Error!'
						);
						callback( false );
					}
				} );
			}
		},

		updateRemoveButton: function() {
			var disabled = this.collection.every( function( item ) {
				return !item.get( 'selected' );
			} );

			this.ui.removeButton.prop( 'disabled', disabled );
		}
	} );

	/**
	 * Jobs list view
	 */
	Jobs.JobsListView = App.Common.TableView.extend( {
		template: '#jobs',
		childView: Jobs.JobRowView,
		emptyView: Jobs.NoJobsView,

		events: {
			'change @ui.selectAll': 'toggleSelectAllJobs'
		},

		ui: {
			selectAll: '.select-all-jobs'
		},

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

		toggleSelectAllJobs: function( e ) {
			this.collection.toggleSelectJobs( e.target.checked );
		},

		updateSelectAllCheckbox: function() {
			var checked = this.collection.every( function( item ) {
				return item.get( 'selected' );
			} );

			this.ui.selectAll.prop( 'checked', checked );
		}
	} );

	/**
	 * Job details model
	 */
	Jobs.Job = Backbone.Model.extend( _.extend( {}, App.Common.DeferredFetchMixin, {
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

		urlRoot: '/jobs/',

		oldFetch: Backbone.Model.prototype.fetch,

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
		className: 'task',
		templateHelpers: App.Common.templateHelpers,

		events: {
			'click .clickable': 'showError'
		},

		initialize: function() {
			if ( this.model.get( 'failed' ) ) {
				this.$el.addClass( 'failed' );
			}
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
		templateHelpers: App.Common.templateHelpers,

		ui: {
			'all': '.check-all',
			'failed': '.check-failed'
		},

		events: {
			'click .remove-button': 'removeJob',
			'click .restart-button': 'restartJob',
			'click .edit-button': 'editJob',
			'change @ui.all, @ui.failed': 'filterFailed'
		},

		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
			this.model.set( 'onlyFailed', false, {
				silent: true
			} );
		},

		onRender: function() {
			App.trigger( 'header:resize' );
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
						App.navigate( 'jobs' );
					},
					error: function( model, response ) {
						App.Alerts.Manager.add(
							'danger',
							response.responseText || 'Error while removing a job.',
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
		},

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
	 */
	Jobs.JobView = App.Common.TableView.extend( {
		template: '#job',
		className: 'panel panel-default',
		templateHelpers: App.Common.templateHelpers,
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

			this.update();
		},

		update: function() {
			this.collection.reset( this.model.get( 'tasks' ) );
			this.render();
			App.trigger( 'header:update', true );
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

		templateHelpers: {
			findBrowser: function( browsers, browser ) {
				return _.indexOf( _.map( browsers, function( browser ) {
					return browser.toLowerCase();
				} ), browser.toLowerCase() ) > -1;
			}
		},

		initialize: function() {
			this.listenTo( this.model, 'invalid', this.showError );
			this.listenTo( this.model, 'sync', this.handleSave );

			this.model.set( 'tempBrowsers', this.model.get( 'browsers' ).slice(), {
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
			App.header.show( new Jobs.JobsListHeaderView( {
				collection: Jobs.jobsList
			} ) );

			App.content.show( new Jobs.JobsListView( {
				collection: Jobs.jobsList
			} ) );

			Jobs.jobsList.fetch( {
				reset: true,
				force: true
			} );
		},

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
		Jobs.controller = new Jobs.Controller();

		Jobs.router = new Jobs.Router( {
			controller: Jobs.controller
		} );
	} );
} );
