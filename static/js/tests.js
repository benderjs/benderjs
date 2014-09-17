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
			tags: null,
			filter: null,
			running: false,
			onlyFailed: false
		},

		initialize: function() {
			this
				.set( 'tags', [] )
				.set( 'filter', [] );

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
			'all': '.check-all',
			'failed': '.check-failed'
		},

		events: {
			'click @ui.run': 'runTests',
			'click @ui.create': 'showCreateJob',
			'change @ui.filter': 'updateFilter',
			'change @ui.all, @ui.failed': 'updateFailedFilter'
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

				// show all filtered
				App.header.currentView.filterAll();
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

		updateFailedFilter: function() {
			if ( this.ui.all.is( ':checked' ) ) {
				this.model.set( 'onlyFailed', false );
				$( '.tests' ).removeClass( 'only-failed' );
			} else if ( this.ui.failed.is( ':checked' ) ) {
				this.model.set( 'onlyFailed', true );
				$( '.tests' ).addClass( 'only-failed' );
			}
		},

		filterAll: function() {
			this.ui.all.parent().button( 'toggle' );
		}
	} );

	/**
	 * Test result model
	 */
	Tests.Result = Backbone.Model.extend( {
		defaults: {
			id: '',
			style: '',
			state: 'waiting',
			passed: 0,
			failed: 0,
			ignored: 0,
			duration: 0,
			broken: false,
			errors: null,
			slow: false
		},

		reset: function() {
			this.set( this.defaults );
		},

		parse: function( data ) {
			return {
				style: data.success ? data.ignored === true ? 'warning' : 'success' : 'danger',
				state: data.state || 'waiting',
				passed: data.passed,
				failed: data.failed,
				ignored: data.ignored,
				duration: data.duration,
				broken: data.broken,
				errors: this.getErrors( data ),
				slow: this.isSlow( data )
			};
		},

		update: function( data ) {
			this.set( this.parse( data ) );
		},

		getErrors: function( data ) {
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
		},

		isSlow: function( data ) {
			// average duration above the threshold
			return ( Math.round( data.duration / data.total ) > bender.config.slowAvgThreshold ) ||
				// total duration above the threshold
				( data.duration > bender.config.slowThreshold );
		}
	} );

	/**
	 * Test result view
	 */
	Tests.ResultView = Backbone.Marionette.ItemView.extend( {
		template: '#test-result',

		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
		},

		templateHelpers: {
			getIconStyle: function( style ) {
				return 'glyphicon' + ( style ?
					' glyphicon-' + ( style === 'success' ? 'ok' : style === 'warning' ? 'forward' : 'remove' ) :
					'' );
			}
		}
	} );

	/**
	 * Test model
	 */
	Tests.Test = Backbone.Model.extend( {
		defaults: {
			// base properties
			id: '',
			group: '',
			tags: null,

			// result properties
			result: null,

			// visibility filter
			visible: true
		},

		parse: function( data ) {
			// create an instance of Result model for the result
			data.result = new Tests.Result( data, {
				parse: true
			} );

			return data;
		}
	} );

	/**
	 * Test view
	 */
	Tests.TestView = Marionette.ItemView.extend( {
		template: '#test',
		tagName: 'tr',

		resultView: null,

		ui: {
			result: '.result'
		},

		events: {
			'click @ui.result': 'showErrors'
		},

		initialize: function() {
			this.resultView = new Tests.ResultView( {
				model: this.model.get( 'result' ),
				el: this.$el.find( '.result' )[ 0 ]
			} );
		},

		onRender: function() {
			// var model = this.model.toJSON(),
			// 	s = model.status;

			// // TODO hide if doesn't match the filter
			// this.el.className = ( s ? ' ' + s + ' bg-' + s + ' text-' + s : '' ) +
			// 	( model.visible ? '' : ' hidden' );

			// // scroll window to make result visible if needed
			// if ( model.result ) {
			// 	this.scrollTo();
			// }
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
				// test is included by the filter
				return test.get( 'visible' ) &&
					// "Show Failed" is checked and the test contains erros
					( Tests.testStatus.get( 'onlyFailed' ) ? test.get( 'errors' ) : true );
			} ), function( test ) {
				return test.get( 'id' );
			} );
		},

		clearCurrentResult: function() {
			var current = this.get( bender.current );
			if ( current ) {
				current.get( 'result' ).reset();
			}
		},

		clearResults: function() {
			this.each( function( test ) {
				test.get( 'result' ).reset();
			} );
		},

		update: function( data ) {
			var model = this.get( data.id );

			if ( model ) {
				model.get( 'result' ).update( data );
			}

		}
	} ) )();

	Tests.filteredTests = new Backbone.VirtualCollection( Tests.testsList, {
		filter: function( test ) {
			var tags = test.get( 'tags' );

			return tags;
		}
	} );

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
				this.$el.find( '.tests' ).addClass( 'only-failed' );
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
			browsers: null,
			description: '',
			snapshot: false,
			tests: null,
			filter: null
		},

		initialize: function() {
			this.set( 'browsers', [] )
				.set( 'tests', Tests.testsList.getIds() )
				.set( 'filter', Tests.testStatus.get( 'filter' ) );
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
			'create': '.create-button'
		},

		events: {
			'change @ui.browsers': 'updateBrowsers',
			'change @ui.description': 'updateDescription',
			'click @ui.create': 'createJob',
			'change .take-snapshot': 'updateSnapshot',
			'click .add-captured-button': 'addCaptured',
			'click .add-all-button': 'addAll'
		},

		initialize: function() {
			this.listenTo( this.model, 'invalid', this.showError );
			this.listenTo( this.model, 'sync', this.handleCreate );
		},

		onRender: function() {
			App.Common.ModalView.prototype.onRender.apply( this, arguments );

			this.ui.browsers.chosen( {
				width: '100%'
			} );
		},

		updateBrowsers: function( event, params ) {
			var browsers = this.model.get( 'browsers' ),
				idx;

			if ( params.selected ) {
				browsers.push( params.selected.toLowerCase() );
			} else if ( params.deselected &&
				( idx = _.indexOf( browsers, params.deselected.toLowerCase() ) ) > -1 ) {
				browsers.splice( idx, 1 );
			}

			this.model.set( 'browsers', browsers );
		},

		addCaptured: function() {
			var current = this.model.get( 'browsers' ) || [],
				that = this,
				captured = [],
				toAdd;

			App.Browsers.browsersList.each( function( browser ) {
				var clients = browser.get( 'clients' );

				if ( browser.id !== 'Unknown' && clients && clients.length ) {
					captured.push( browser.id.toLowerCase() );
				}
			} );

			toAdd = _.uniq( current.concat( captured ) );

			this.model.set( 'browsers', toAdd );

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

			this.model.set( 'browsers', browsers );

			_.each( browsers, function( id ) {
				that.ui.browsers.find( 'option[value="' + id + '"]' ).attr( 'selected', true );
			} );

			this.ui.browsers.trigger( 'chosen:updated' );
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

		updateDescription: function( event ) {
			var description = $( event.target ).val().replace( /^\s+|\s+$/g, '' );
			this.model.set( 'description', description );
		},

		updateSnapshot: function( event ) {
			this.model.set( 'snapshot', event.target.checked );
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
				App.vent.trigger( 'filter:tests', Tests.testStatus.get( 'filter' ) );
			} );
		},

		update: function( data ) {
			Tests.testStatus.update( data );
			Tests.testsList.update( data );
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

		bender.on( 'update', Tests.controller.update );

		bender.on( 'complete', function() {
			App.vent.trigger( 'tests:stop' );
		} );

		// adjust body padding on window resize
		$( window ).bind( 'resize', function() {
			App.$body.css( 'paddingTop', App.$navbar.height() + 1 + 'px' );
		} );
	} );
} );
