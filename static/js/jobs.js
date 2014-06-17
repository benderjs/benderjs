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
	Jobs.Job = Backbone.Model.extend( {
		defaults: {
			id: '',
			description: '',
			created: 0,
			browsers: [],
			filter: [],
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
		templateHelpers: App.Common.templateHelpers,
		itemView: Jobs.TaskView,

		events: {
			'click .back-button': 'goBack',
			'click .remove-button': 'removeJob',
			'click .restart-button': 'restartJob'
		},

		initialize: function() {
			this.collection = new Backbone.Collection();
			this.listenTo( this.model, 'change', this.render );
			this.update();
		},

		update: function() {
			var that = this;

			this.model.fetch( {
				success: function() {
					that.collection.reset( that.model.get( 'tasks' ) );
				},
				error: App.show404
			} );
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
							that.update();
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
		}
	} );

	/**
	 * Task errors view
	 */
	Jobs.TaskErrorsView = App.Common.ModalView.extend( {
		template: '#task-errors'
	} );

	/**
	 * Controller for Jobs module
	 * @type {Object}
	 */
	Jobs.controller = {
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
