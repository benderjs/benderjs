/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @module App.Tests
 */

App.module( 'Tests', function( Tests, App, Backbone ) {
	'use strict';

	/**
	 * Tests filter model
	 */
	Tests.Filter = Backbone.Model.extend( {
		defaults: {
			filter: [],
			tokens: null
		},

		initialize: function() {
			this.listenTo( Tests.controller, 'tests:loaded', this.buildFilters, this );

			this.on( 'change:filter', function() {
				Tests.controller.trigger( 'tests:filter', this.get( 'filter' ) );
			} );
		},

		buildFilters: function( tests, filter ) {
			var tokens = [];

			tests.each( function( item ) {
				item = item.toJSON();

				_.each( item.tags, function( tag ) {
					tag = 'tag:' + tag;

					if ( _.indexOf( tokens, tag ) < 0 ) {
						tokens.push( tag );
					}
				} );

				var group = 'group:' + item.group;

				if ( _.indexOf( tokens, group ) < 0 ) {
					tokens.push( group );
				}

				var path = 'path:/' + item.id.substr( 0, item.id.lastIndexOf( '/' ) );

				if ( _.indexOf( tokens, path ) < 0 ) {
					tokens.push( path );
				}

				var name = 'name:' + item.id.slice( item.id.lastIndexOf( '/' ) > -1 ? item.id.lastIndexOf( '/' ) + 1 : 0 );

				if ( _.indexOf( tokens, name ) < 0 ) {
					tokens.push( name );
				}

			} );

			tokens.sort();

			// add exclusion filters
			tokens = tokens.concat( _.map( tokens, function( token ) {
				return '-' + token;
			} ) );

			// add flag filters
			tokens.unshift( 'is:failed', 'is:passed', 'is:manual', 'is:unit' );

			this.set( 'tokens', tokens );

			this.setFilter( filter );
		},

		setFilter: function( filter ) {
			var tokens = this.get( 'tokens' ),
				parsed = _.filter( filter, function( value ) {
					return _.indexOf( tokens, value ) > -1;
				} );

			this.set( 'filter', parsed );

			this.trigger( 'update:filter', parsed );

			// some invalid tokens were stripped
			if ( filter.length && !parsed.length ) {
				Tests.controller.trigger( 'tests:filter', parsed );
			}
		}
	} );

	/**
	 * Test filter view
	 */
	Tests.FilterView = Marionette.ItemView.extend( {
		template: '#test-filter',
		className: 'filter-form',

		ui: {
			filter: '.test-filter'
		},

		events: {
			'change @ui.filter': 'updateFilter'
		},

		initialize: function() {
			this.listenTo( this.model, 'change:tokens', this.render );
			this.listenTo( this.model, 'update:filter', this.update );
		},

		onRender: function() {
			this.ui.filter.chosen( {
				width: '100%',
				search_contains: true
			} );
		},

		update: function() {
			var filter = this.model.get( 'filter' );

			_.each( filter, function( value ) {
				this.ui.filter.find( '[value="' + value + '"]' ).prop( 'selected', true );
			}, this );

			this.ui.filter.trigger( 'chosen:updated' );
		},

		updateFilter: function( event, params ) {
			var filter = _.clone( this.model.get( 'filter' ) );

			if ( params.selected ) {
				filter.push( params.selected );
			} else if ( params.deselected ) {
				filter.splice( _.indexOf( filter, params.deselected ), 1 );
			}

			this.model.set( 'filter', filter );
		}
	} );


	/**
	 * Tests status model
	 */
	Tests.TestStatus = Backbone.Model.extend( {
		defaults: {
			passed: 0,
			failed: 0,
			time: 0,
			start: 0,
			completed: 0,
			total: 0,

			running: false
		},

		initialize: function() {
			this.listenTo( Tests.controller, 'tests:stop', this.stop, this );
			this.listenTo( Tests.controller, 'tests:update', this.update, this );
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
			if ( typeof data == 'object' && data.state === 'done' ) {
				var model = this.toJSON();

				this.set( {
					completed: model.completed + 1,
					failed: model.failed + ( data.failed || 0 ),
					passed: model.passed + ( data.passed || 0 ),
					time: new Date() - model.start
				} );
			}
		},

		start: function( total ) {
			this.reset();
			this.set( {
				running: true,
				total: total
			} );
		},

		stop: function() {
			this.set( 'running', false );
		},

		setFilter: function( filter ) {
			Tests.testFilter.setFilter( filter );
		}
	} );

	/**
	 * Test status view
	 */
	Tests.TestStatusView = Marionette.ItemView.extend( {
		template: '#test-status',
		className: 'test-status',

		templateHelpers: App.Common.templateHelpers,

		initialize: function() {
			this.listenTo( this.model, 'change', this.render, this );
		},

	} );

	/**
	 * Tests header view
	 */
	Tests.TestHeaderView = Marionette.LayoutView.extend( {
		template: '#test-header',
		className: 'row',

		regions: {
			left: '.header-left',
			right: '.header-right'
		},

		ui: {
			'run': '.run-button',
			'create': '.create-button'
		},

		events: {
			'click @ui.run': 'clickRun',
			'click @ui.create': 'clickCreateJob'
		},

		templateHelpers: App.Common.templateHelpers,

		initialize: function() {
			this.listenTo( App.vent, 'tests:start', function() {
				this.updateButtons( false );
			} );

			this.listenTo( App.vent, 'tests:stop', function() {
				this.updateButtons( true );
			} );
		},

		updateButtons: function( enabled ) {
			this.ui.run
				.attr( 'title', ( enabled ? 'Start' : 'Stop' ) + ' tests' )
				.find( 'span' )
				.toggleClass( 'glyphicon-play', enabled )
				.toggleClass( 'glyphicon-stop', !enabled );

			this.ui.create.attr( 'disabled', !enabled );
		},

		clickRun: function() {
			Tests.controller.runTests();
		},

		clickCreateJob: function() {
			Tests.controller.showCreateJob();
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
			slow: false,
			success: true
		},

		reset: function() {
			this.set( this.defaults );
		},

		parse: function( data ) {
			data.style = ( !data.state || data.state === 'started' ) ? '' :
				data.success ? data.ignored === true ? 'warning' :
				'success' : 'danger';

			data.state = data.state || 'waiting';
			data.errors = data.results ? this.getErrors( data ) : null;
			data.slow = data.total && this.isSlow( data );
			data.success = data.success || false;

			return data;
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
	 * Test model
	 */
	Tests.Test = Backbone.Model.extend( {
		defaults: {
			// base properties
			id: '',
			group: '',
			tags: null,

			// test type
			unit: true,
			manual: false,

			// result sub-model
			result: null
		},

		parse: function( data ) {
			data.result = new Tests.Result( this.attributes, {
				parse: true
			} );

			return data;
		},

		getResult: function() {
			var result;

			if ( !( result = this.get( 'result' ) ) ) {
				result = new Tests.Result( this.toJSON(), {
					parse: true
				} );

				this.set( 'result', result );
			}

			return result;
		}
	} );

	/**
	 * Tests collection
	 */
	Tests.TestsList = Backbone.Collection.extend( {
		model: Tests.Test
	} );

	/**
	 * Tests and filtered tests collections
	 */
	Tests.Tests = Backbone.Model.extend( {
		url: '/tests',

		defaults: {
			tests: null,
			filtered: null
		},

		excludes: {},
		filters: {},

		initialize: function() {
			this.listenTo( Tests.controller, 'tests:filter', this.setFilters, this );
			this.listenTo( App.vent, 'tests:start', this.clearResults, this );
			this.listenTo( App.vent, 'tests:stop', this.clearCurrentResult, this );
			this.listenTo( Tests.controller, 'tests:update', this.updateResult, this );

			this.set( 'tests', new Tests.TestsList() );
			this.set( 'filtered', new Backbone.VirtualCollection( this.get( 'tests' ) ) );
		},

		parse: function( response ) {
			response.tests = new Tests.TestsList( response.test, {
				parse: false
			} );
			response.filtered = new Backbone.VirtualCollection( response.tests );

			delete response.test;

			return response;
		},

		needsFiltering: function() {
			return _.some( this.filters, function( filter ) {
				return filter.length;
			} );
		},

		setFilters: function( filters ) {
			var that = this,
				name;

			// reset filters
			for ( name in this.filters ) {
				this.filters[ name ] = [];
			}

			for ( name in this.excludes ) {
				this.excludes[ name ] = [];
			}

			_.each( filters, function( filter ) {
				filter = filter.split( ':' );

				var name = filter[ 0 ];

				if ( name.charAt( 0 ) === '-' ) {
					name = name.substr( 1 );

					if ( !that.excludes[ name ] ) {
						that.excludes[ name ] = [];
					}

					that.excludes[ name ].push( filter[ 1 ] );
				} else {
					if ( !that.filters[ name ] ) {
						that.filters[ name ] = [];
					}

					that.filters[ name ].push( filter[ 1 ] );
				}
			} );

			var filtered = this.get( 'filtered' );

			filtered.updateFilter( this.needsFiltering() && _.bind( this.filterFunc, this ) );
			this.trigger( 'change', this );
		},

		filterFunc: function( item ) {
			item = item.toJSON();

			function escape( string ) {
				return string.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&' );
			}

			function checkProperty( filters, name ) {
				if ( name === 'name' ) {
					return _.some( filters, function( filter ) {
						return ( new RegExp( escape( '/' + filter ) + '$' ) ).test( item.id );
					} );
				}

				if ( name === 'path' ) {
					return _.some( filters, function( filter ) {
						return item.id.indexOf( filter.substr( 1 ) ) === 0;
					} );
				}

				if ( name === 'group' ) {
					return _.indexOf( filters, item.group ) > -1;
				}

				if ( name === 'tag' ) {
					return _.some( filters, function( filter ) {
						return _.indexOf( item.tags, filter ) > -1;
					} );
				}
			}

			function checkFlags( filters ) {
				if ( !filters || !filters.length ) {
					return true;
				}

				return _.every( filters, function( filter ) {
					if ( filter === 'failed' ) {
						return item.result && !item.result.toJSON().success;
					} else if ( filter === 'passed' ) {
						return !item.result || item.result.toJSON().success;
					} else {
						return item[ filter ];
					}
				} );
			}

			function checkProperties( filters ) {
				var result = false,
					keys = _.keys( filters ),
					empty = true;

				if ( keys.length === 1 && filters.is && filters.is.length ) {
					return true;
				}

				_.each( filters, function( filter, name ) {
					if ( name === 'is' ) {
						return;
					}

					if ( filter.length ) {
						empty = false;

						if ( checkProperty( filter, name ) ) {
							result = true;
						}
					}
				} );

				return empty || result;
			}

			function checkExcludes( filters ) {
				var result = true;

				_.each( filters, function( filter, name ) {
					if ( name === 'is' ) {
						return;
					}

					if ( filter.length ) {
						if ( checkProperty( filter, name ) ) {
							result = false;
						}
					}
				} );

				return result;
			}

			return checkFlags( this.filters.is ) &&
				checkExcludes( this.excludes ) &&
				checkProperties( this.filters );
		},

		toJSON: function() {
			var attr = this.attributes,
				json = {},
				name;

			for ( name in attr ) {
				json[ name ] = attr[ name ].toJSON();
			}

			return json;
		},

		getIds: function() {
			return this.get( 'filtered' ).map( function( item ) {
				return item.id;
			} );
		},

		clearCurrentResult: function() {
			var current = this.get( 'tests' ).get( bender.current );

			if ( current ) {
				current.getResult().reset();
				this.trigger( 'updateResult', bender.current );
			}
		},

		clearResults: function() {
			this.get( 'tests' ).each( function( test ) {
				test.getResult().reset();
			} );

			this.trigger( 'change', this );
		},

		updateResult: function( data ) {
			var model = this.get( 'tests' ).get( data.id );

			if ( model ) {
				model.getResult().update( data );
				this.trigger( 'updateResult', data.id );
			}
		},

		getResult: function( id ) {
			var model = this.get( 'tests' ).get( id );

			return model ? model.getResult() : null;
		}
	} );

	/**
	 * Test list view
	 */
	Tests.TestsView = Marionette.ItemView.extend( {
		template: '#tests',
		testTemplate: null,
		resultTemplate: null,
		className: 'panel panel-default',

		templateHelpers: {
			getIconStyle: function( style ) {
				return 'glyphicon' + ( style ?
					' glyphicon-' + ( style === 'success' ? 'ok' : style === 'warning' ? 'forward' : 'remove' ) :
					'' );
			},

			getClass: function( result ) {
				var s = result && result.get( 'style' );

				return s ? ' ' + s + ' bg-' + s + ' text-' + s : '';
			}
		},

		events: {
			'click .result .result': 'showErrors'
		},

		ui: {
			container: 'tbody'
		},

		initialize: function() {
			var that = this;

			this.listenTo( this.model, 'change', this.render, this );
			this.listenTo( this.model, 'updateResult', this.renderResult, this );
			this.testTemplate = _.template( $( '#test' ).html() );
			this.resultTemplate = _.template( $( '#test-result' ).html() );

			this.templateHelpers.renderResult = function( result ) {
				return result ? that.resultTemplate( _.extend( {}, result.toJSON(), that.templateHelpers ) ) : '';
			};
		},

		onRender: function() {
			this.ui.container.html( this.renderChildren() );
		},

		renderChildren: function() {
			var filtered = this.model.get( 'filtered' ),
				html = [];

			filtered.each( function( test ) {
				html.push( this.testTemplate( _.extend( {}, test.toJSON(), this.templateHelpers ) ) );
			}, this );

			html = html.join( '' );

			return html;
		},

		renderResult: function( id ) {
			var result = this.model.get( 'tests' ).get( id ),
				row;

			if ( result ) {
				result = result.get( 'result' ).toJSON();

				row = this.$el.find( '[data-id="' + id + '"]' );

				var s = result.style;

				row[ 0 ].className = s ? ' ' + s + ' bg-' + s + ' text-' + s : '';

				row.find( '.result' ).html( this.resultTemplate( _.extend( {}, result, this.templateHelpers ) ) );
				this.scrollTo( row );
			}
		},

		scrollTo: function( elem ) {
			var top = elem.offset().top,
				bottom = top + elem.height(),
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

		showErrors: function( event ) {
			var id = $( event.target ).parent().parent().data( 'id' ),
				result = this.model.getResult( id ),
				errors;

			if ( !result ) {
				return;
			}

			errors = result.get( 'errors' );

			if ( !errors || !errors.length ) {
				return;
			}

			App.modal.show(
				new App.Common.TestErrorsView( {
					model: result
				} )
			);
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
				.set( 'tests', Tests.tests.getIds() )
				.set( 'filter', Tests.testFilter.get( 'filter' ) );
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

	// initial document title
	var oldDocTitle = document.title;

	/**
	 * Tests controller
	 */
	Tests.controller = new( Marionette.Controller.extend( {
		listTests: function( filter ) {
			Tests.tests = new Tests.Tests();

			Tests.testStatus = new Tests.TestStatus();
			Tests.testFilter = new Tests.Filter();

			Tests.testStatus.on( 'change', Tests.controller.updateTitle );

			var headerView = new Tests.TestHeaderView();

			App.header.show( headerView );

			headerView.left.show( new Tests.FilterView( {
				model: Tests.testFilter
			} ) );

			headerView.right.show( new Tests.TestStatusView( {
				model: Tests.testStatus
			} ) );

			if ( !filter ) {
				filter = 'is:unit';
			}

			App.content.empty();

			Tests.tests.fetch().done( function( data ) {
				Tests.controller.trigger( 'tests:loaded', data.tests, filter.split( ',' ) );

				App.content.show( new Tests.TestsView( {
					model: Tests.tests
				} ) );
			} );
		},

		runTests: function() {
			var ids;

			if ( !Tests.testStatus.get( 'running' ) ) {
				ids = Tests.tests.getIds();

				if ( !ids.length ) {
					return App.Alerts.Manager.add(
						'danger',
						'There are no tests to run, aborting.',
						'Error:'
					);
				}

				App.vent.trigger( 'tests:start' );

				// show all filtered
				Tests.testStatus.start( ids.length );
				bender.run( ids );
			} else {
				bender.stop();
				Tests.testStatus.stop();
			}
		},

		showCreateJob: function() {
			App.modal.show(
				new Tests.CreateJobView( {
					model: new Tests.NewJob()
				} )
			);
		},

		updateTitle: function( model ) {
			var status = '';

			if ( model && ( model = model.toJSON() ) && model.running ) {
				status = model.passed + ' passed / ' + model.failed + ' failed - ';
			}

			document.title = status + oldDocTitle;
		},

		updateURL: function( filter ) {
			App.navigate( 'tests/' + filter.join( ',' ), {
				trigger: false
			} );

			_.defer( function() {
				App.trigger( 'header:resize' );
			} );
		}
	} ) )();

	/**
	 * Tests Router
	 */
	Tests.Router = Marionette.AppRouter.extend( {
		name: 'tests',

		appRoutes: {
			'tests(/*filters)': 'listTests'
		}
	} );

	/**
	 * Add initialzier for tests module
	 */
	Tests.addInitializer( function() {
		// create router instance
		Tests.router = new Tests.Router( {
			controller: Tests.controller
		} );

		// attach event listeners
		this.listenTo( Tests.controller, 'tests:filter', Tests.controller.updateURL );

		bender.on( 'update', function( data ) {
			Tests.controller.trigger( 'tests:update', data );
		} );

		bender.on( 'complete', function() {
			App.vent.trigger( 'tests:stop' );
		} );
	} );
} );
