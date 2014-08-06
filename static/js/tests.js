/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @module App.Tests
 */

App.module( 'Tests', function( Tests, App, Backbone ) {
	'use strict';

	/**
	 * Tests Router
	 */
	Tests.Router = Marionette.AppRouter.extend( {
		name: 'tests',

		appRoutes: {
			'tests': 'listTests',
			'tests/*filters': 'listTests'
		}
	} );

	/**
	 * Tests status model
	 */
	Tests.testStatus = new( Backbone.Model.extend( {
		defaults: {
			passed: 0,
			failed: 0,
			time: 0,
			start: 0,
			completed: 0,
			total: 0,
			tags: [],
			filter: [],
			running: false,
			onlyFailed: false
		},

		initialize: function() {
			App.vent.on( 'tests:stop', this.stop, this );
		},

		increment: function( name, value ) {
			this.set( name, this.get( name ) + value );
		},

		reset: function() {
			this.set( {
				passed: 0,
				failed: 0,
				time: 0,
				start: +new Date(),
				completed: 0,
				total: 0,
				running: false
			} );
		},

		update: function( data ) {
			if ( typeof data == 'object' && data !== null ) {
				this.increment( 'passed', data.passed || 0 );
				this.increment( 'failed', data.failed || 0 );
				this.set( 'time', new Date() - this.get( 'start' ) );
				this.increment( 'completed', 1 );
			}
		},

		start: function( total ) {
			this.reset();
			this.set( 'running', true ).set( 'total', total );
		},

		stop: function() {
			this.set( 'running', false );
		},

		parseFilter: function() {
			var model = this.toJSON(),
				existing;

			existing = _.filter( model.filter, function( val ) {
				return _.indexOf( model.tags, val ) > -1;
			} );

			this.set( 'filter', existing );
		}
	} ) )();

	/**
	 * Tests header view
	 */
	Tests.TestHeaderView = Marionette.ItemView.extend( {
		template: '#test-header',
		className: 'row',

		ui: {
			'run': '.run-button',
			'create': '.create-button',
			'filter': '.tag-filter',
			'clear': '.clear-filter',
			'all': '#all',
			'failed': '#failed'
		},

		events: {
			'click @ui.run': 'runTests',
			'click @ui.create': 'showCreateJob',
			'change @ui.filter': 'updateFilter',
			'change #all, #failed': 'filterFailed'
		},

		templateHelpers: App.Common.templateHelpers,

		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
		},

		onRender: function() {
			this.ui.filter.chosen( {
				width: '250px'
			} );

			App.navigate( 'tests/' + this.model.get( 'filter' ).join( ',' ), {
				trigger: false
			} );
		},

		runTests: function() {
			var ids;

			if ( !this.model.get( 'running' ) ) {
				ids = Tests.testsList.getIds();

				if ( !ids.length ) {
					return App.Alerts.Manager.add(
						'danger',
						'There are no tests to run, aborting.',
						'Error:'
					);
				}

				App.vent.trigger( 'tests:start' );

				this.model.start( ids.length );
				bender.run( ids );
			} else {
				App.vent.trigger( 'tests:stop' );
				bender.stop();
				this.model.stop();
			}
		},

		showCreateJob: function() {
			App.modal.show(
				new Tests.CreateJobView( {
					model: new Tests.NewJob()
				} )
			);
		},

		updateFilter: function( event, params ) {
			var filter = this.model.get( 'filter' );

			if ( params.selected ) {
				filter.push( params.selected );
			} else if ( params.deselected ) {
				filter.splice( _.indexOf( filter, params.deselected ), 1 );
			}

			this.model.set( 'filter', filter );
			App.vent.trigger( 'tests:filter', filter );
			App.navigate( 'tests/' + filter.join( ',' ), {
				trigger: false
			} );
			App.$body.css( 'paddingTop', App.$navbar.height() + 1 + 'px' );
		},

		filterFailed: function() {
			if ( this.ui.all.is( ':checked' ) ) {
				this.model.set( 'onlyFailed', false );
				$( '.tests' ).removeClass( 'tests-failed' );
			} else if ( this.ui.failed.is( ':checked' ) ) {
				this.model.set( 'onlyFailed', true );
				$( '.tests' ).addClass( 'tests-failed' );
			}

		}
	} );

	/**
	 * Test model
	 */
	Tests.Test = Backbone.Model.extend( {
		defaults: {
			id: '',
			group: '',
			tags: [],
			result: '',
			status: '',
			errors: null,
			visible: true,
			slow: false
		},

		reset: function() {
			this.set( {
				result: '',
				status: '',
				errors: null,
				slow: false
			} );
		}
	} );

	/**
	 * Test view
	 */
	Tests.TestView = Marionette.ItemView.extend( {
		template: '#test',
		tagName: 'tr',
		className: 'test',
		templateHelpers: {
			getIconStyle: function( status ) {
				return 'glyphicon' + ( status ?
					' glyphicon-' + ( status === 'success' ? 'ok' : status === 'warning' ? 'forward' : 'remove' ) :
					'' );
			}
		},

		events: {
			'click .result': 'showErrors'
		},

		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
		},

		onRender: function() {
			var model = this.model.toJSON();

			this.el.className = 'test ' +
				( model.status ? model.status + ' bg-' + model.status + ' text-' + model.status : '' ) +
				( model.visible ? '' : ' hidden' );

			// scroll window to make result visible if needed
			if ( model.result ) {
				this.scrollTo();
			}
		},

		scrollTo: function() {
			var top = this.$el.offset().top,
				bottom = top + this.$el.height(),
				$window = $( window ),
				scroll = $( window ).scrollTop(),
				height = $window.height();


			// item is hidden at the bottom
			if ( scroll + height < bottom ) {
				$window.scrollTop( bottom - height );
				// item is hidden at the top
			} else if ( scroll + App.$navbar.height() > top ) {
				$( window ).scrollTop( top - App.$navbar.height() - 1 );
			}
		},

		showErrors: function() {
			var errors = this.model.get( 'errors' );

			if ( !errors || !errors.length ) {
				return;
			}

			App.modal.show(
				new App.Common.TestErrorsView( {
					model: this.model
				} )
			);
		}

	} );

	/**
	 * Tests collection
	 */
	Tests.testsList = new( Backbone.Collection.extend( {
		model: Tests.Test,
		url: '/tests',

		initialize: function() {
			App.vent.on( 'tests:filter', this.filterTests, this );
			App.vent.on( 'tests:start', this.clearResults, this );
			App.vent.on( 'tests:stop', this.clearCurrentResult, this );
		},

		parse: function( response ) {
			this.getTags( response.test );

			return response.test;
		},

		filterTests: function( filter ) {
			var includes = [],
				excludes = [];

			// show all
			if ( !filter ) {
				this.each( function( test ) {
					test.set( 'visible', true );
				} );

				return;
			}

			_.each( filter, function( tag ) {
				if ( tag.charAt( 0 ) === '-' ) {
					excludes.push( tag.slice( 1 ) );
				} else if ( tag ) {
					includes.push( tag );
				}
			} );

			this.each( function( test ) {
				var tags = test.get( 'tags' ),
					result = true;

				if ( includes.length ) {
					result = _.any( tags, function( tag ) {
						return _.indexOf( includes, tag ) > -1;
					} );
				}

				if ( excludes.length ) {
					result = result && !_.any( tags, function( tag ) {
						return _.indexOf( excludes, tag ) > -1;
					} );
				}

				test.set( 'visible', result );
			} );
		},

		getTags: function( tests ) {
			var tags = [],
				negTags = [];

			_.each( tests, function( test ) {
				tags = tags.concat( test.tags );
			} );

			tags = _.uniq( tags ).sort();

			negTags = _.map( tags, function( tag ) {
				return '-' + tag;
			} );

			tags = tags.concat( negTags );

			Tests.testStatus.set( 'tags', tags );
		},

		getIds: function() {
			return _.map( this.filter( function( test ) {
				return test.get( 'visible' );
			} ), function( test ) {
				return test.get( 'id' );
			} );
		},

		clearCurrentResult: function() {
			var current = this.get( bender.current );
			if ( current ) {
				current.set( 'result', '' );
			}
		},

		clearResults: function() {
			this.each( function( test ) {
				test.reset();
			} );
		}
	} ) )();

	Tests.NoTestsView = Marionette.ItemView.extend( {
		template: '#no-tests',
		tagName: 'tr'
	} );

	/**
	 * Test list view
	 */
	Tests.TestsListView = App.Common.TableView.extend( {
		template: '#tests',
		childTemplate: '#test',
		childView: Tests.TestView,
		emptyView: Tests.NoTestsView,

		onRender: function() {
			var status = Tests.testStatus.toJSON();

			if ( status.onlyFailed ) {
				this.$el.find( '.tests' ).addClass( 'tests-failed' );
			}

			if ( status.filter.length ) {
				App.vent.trigger( 'tests:filter', status.filter );
			}
		}
	} );

	/**
	 * New job model
	 */
	Tests.NewJob = Backbone.Model.extend( {
		defaults: {
			browsers: [],
			description: '',
			snapshot: false,
			tests: [],
			filter: []
		},

		initialize: function() {
			this.set( 'tests', Tests.testsList.getIds() );
			this.set( 'filter', Tests.testStatus.get( 'filter' ) );
		},

		validate: function( attrs ) {
			if ( !attrs.browsers.length ) {
				return 'No browsers specified for the job';
			}
			if ( !attrs.tests.length ) {
				return 'No tests specified for the job';
			}
		},

		urlRoot: '/jobs'
	} );

	/**
	 * Create a job view
	 */
	Tests.CreateJobView = App.Common.ModalView.extend( {
		template: '#create-job',

		ui: {
			'browsers': '.job-browsers',
			'description': '.job-description',
			'snapshot': '.take-snapshot',
			'create': '.create-button'
		},

		events: {
			'change @ui.browsers': 'updateBrowsers',
			'change @ui.description': 'updateDescription',
			'change @ui.snapshot': 'updateSnapshot',
			'click .dropdown-menu a': 'addBrowser',
			'click @ui.create': 'createJob',
			'click .add-captured-button': 'addCaptured'
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

		addCaptured: function() {
			var current = this.model.get( 'browsers' ),
				browsers = [];

			App.Browsers.browsersList.each( function( browser ) {
				var clients = browser.get( 'clients' );

				if ( clients && clients.length ) {
					browsers.push( browser.id );
				}
			} );

			function addBrowsers() {
				var currentLower = _.map( current, function( browser ) {
						return browser.toLowerCase();
					} ),
					result = [].concat( current );

				_.each( browsers, function( browser ) {
					if ( currentLower.indexOf( browser.toLowerCase() ) === -1 ) {
						result.push( browser );
					}
				} );

				return result;
			}

			this.model.set( 'browsers', current.length ? addBrowsers() : browsers );
		},

		showError: function( model, error ) {
			this.ui.create.prop( 'disabled', false );
			App.Alerts.Manager.add( 'danger', error, 'Error:' );
		},

		handleCreate: function( model ) {
			App.Alerts.Manager.add(
				'success',
				'New job added with ID: <a href="/#jobs/' + model.id + '">' + model.id + '</a>.',
				'Success!'
			);
			this.ui.create.prop( 'disabled', false );
			this.destroy();
		},

		updateBrowsers: function( event ) {
			var browsers = $( event.target ).val().replace( /^\s+|\s+$/g, '' );

			browsers = browsers.length ? browsers.replace( /\s+/g, ' ' ).split( /\s+/ ) : [];

			this.model.set( 'browsers', _.uniq( browsers ) );
		},

		updateDescription: function( event ) {
			var description = $( event.target ).val().replace( /^\s+|\s+$/g, '' );
			this.model.set( 'description', description );
		},

		updateSnapshot: function( event ) {
			this.model.set( 'snapshot', event.target.checked );
		},

		addBrowser: function( event ) {
			var browsers = this.model.get( 'browsers' ),
				name = $( event.target ).text().replace( /^\s+|\s+$/g, '' ),
				pattern = new RegExp( '(?:^|,)' + name + '(?:,|$)', 'i' );

			if ( name && !pattern.test( browsers.join( ',' ) ) ) {
				browsers = browsers.concat( name );
				this.model.set( 'browsers', browsers );
			}
		},

		createJob: function() {
			this.ui.create.prop( 'disabled', true );
			this.model.save();
		}
	} );

	/**
	 * Tests controller
	 * @type {Object}
	 */
	Tests.controller = {
		listTests: function( filter ) {
			Tests.testStatus.set( 'filter', filter ? filter.split( ',' ) : [] );

			App.header.show( new Tests.TestHeaderView( {
				model: Tests.testStatus
			} ) );

			App.content.show( new Tests.TestsListView( {
				collection: Tests.testsList
			} ) );

			Tests.testsList.fetch( {
				reset: true
			} ).done( function() {
				Tests.testStatus.parseFilter();
				Tests.testsList.filterTests( Tests.testStatus.get( 'filter' ) );
			} );
		},

		updateStatus: function( data ) {
			var model;

			function buildResult( data ) {
				var result = [];

				// test was executed
				if ( data.ignored !== true & !data.broken ) {
					result.push( data.passed, 'passed', '/' );
					result.push( data.failed, 'failed' );
					if ( data.ignored ) {
						result.push( '/', data.ignored, 'ignored' );
					}
					result.push( 'in', data.duration + 'ms' );
					// test was ignored as a whole
				} else if ( data.ignored === true ) {
					result.push( 'IGNORED' );
					// test was marked as broken
				} else if ( data.broken ) {
					result.push( 'BROKEN' );
				}

				return result.join( ' ' );
			}

			function getErrors( data ) {
				var errors = [];

				_.each( data.results, function( result, name ) {
					if ( !result.error ) {
						return;
					}

					errors.push( {
						name: name,
						error: result.error
					} );
				} );

				return errors.length ? errors : null;
			}

			if ( typeof data == 'string' ) {
				model = Tests.testsList.get( data );

				if ( model ) {
					model.set( 'result', 'Running...' );
				}
			} else if ( typeof data == 'object' && data !== null ) {
				model = Tests.testsList.get( data.id );

				if ( model ) {
					model
						.set( 'result', buildResult( data ) )
						.set( 'errors', getErrors( data ) )
						.set( 'status', data.success ? data.ignored === true ? 'warning' : 'success' : 'danger' );

					// mark slow tests
					// average duration above the threshold
					if ( ( Math.round( data.duration / data.total ) > bender.config.slowAvgThreshold ) ||
						// total duration above the threshold
						( data.duration > bender.config.slowThreshold ) ) {
						model.set( 'slow', true );
					}
				}
			}

			Tests.testStatus.update( data );
		}
	};

	/**
	 * Add initialzier for tests module
	 */
	Tests.addInitializer( function() {
		// create router instance
		Tests.router = new Tests.Router( {
			controller: Tests.controller
		} );

		// attach event listeners
		Tests.on( 'tests:list', function() {
			App.navigate( 'tests' );
			Tests.controller.listTests();
		} );

		bender.on( 'update', Tests.controller.updateStatus );

		bender.on( 'complete', function() {
			App.vent.trigger( 'tests:stop' );
		} );

		// adjust body padding on window resize
		$( window ).bind( 'resize', function() {
			App.$body.css( 'paddingTop', App.$navbar.height() + 1 + 'px' );
		} );
	} );
} );
