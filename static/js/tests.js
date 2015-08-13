/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

/**
 * @module Tests
 */
App.module( 'Tests', function( Tests, App, Backbone ) {
	'use strict';

	/**
	 * Tests filter model
	 * @constructor module:Tests.Filter
	 * @extends {Backbone.Model}
	 */
	Tests.Filter = Backbone.Model.extend( /** @lends module:Tests.Filter.prototype */ {
		/**
		 * Default values
		 * @default
		 * @type {Object}
		 */
		defaults: {
			filter: [],
			tests: null,
			tokens: null
		},

		/**
		 * Initialize a filter
		 */
		initialize: function() {
			// save new tests and build new filters for those
			this.listenTo( Tests.controller, 'tests:loaded', function( tests, filter ) {
				this.set( 'tests', tests );

				this.buildTokens( filter );
			}, this );

			// rebuild the tokens on the filter change
			this.on( 'change:filter', function() {
				var filter = this.get( 'filter' );

				this.buildTokens( filter );
				/**
				 * Test filter has changed
				 * @event module:Tests.Controller#tests:filter
				 * @type {Array}
				 */
				Tests.controller.trigger( 'tests:filter', filter );
			} );
		},

		/**
		 * Build tokens for the given tests and filter
		 * @param {Array} filter Test filter
		 */
		buildTokens: function( filter ) {
			var tokens = [];

			function checkFlags( item, filters ) {
				if ( !filters || !filters.length ) {
					return true;
				}

				return _.every( filters, function( filter ) {
					filter = filter.split( ':' );

					if ( filter[ 0 ] !== 'is' ) {
						return true;
					} else if ( filter[ 1 ] === 'failed' ) {
						return item.result && !item.result.get( 'success' );
					} else if ( filter[ 1 ] === 'passed' ) {
						return !item.result || item.result.get( 'success' );
					} else {
						return item[ filter[ 1 ] ];
					}
				} );
			}

			this.get( 'tests' ).each( function( item ) {
				item = item.toJSON();

				if ( !checkFlags( item, filter ) ) {
					return;
				}

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

		/**
		 * Set current filter and trigger update if the filter changed
		 * @param {Array} filter Test filter
		 */
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
	 * @constructor module:Tests.FilterView
	 * @extends {Marionette.ItemView}
	 */
	Tests.FilterView = Marionette.ItemView.extend( /** @lends module:Tests.FilterView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#test-filter',

		/**
		 * Test filter view class name
		 * @default
		 * @type {String}
		 */
		className: 'filter-form',

		/**
		 * UI element binding
		 * @default
		 * @type {Object}
		 */
		ui: {
			filter: '.test-filter'
		},

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'change @ui.filter': 'updateFilter'
		},

		/**
		 * Initialize a filter view - bind to the model's events
		 */
		initialize: function() {
			this.listenTo( this.model, 'change:tokens', this.render );
			this.listenTo( this.model, 'update:filter', this.update );
		},

		/**
		 * Handle render event
		 */
		onRender: function() {
			this.ui.filter.chosen( {
				width: '100%',
				search_contains: true
			} );
		},

		/**
		 * Update the view - mark selected tokens
		 */
		update: function() {
			var filter = this.model.get( 'filter' );

			_.each( filter, function( value ) {
				this.ui.filter.find( '[value="' + value + '"]' ).prop( 'selected', true );
			}, this );

			this.ui.filter.trigger( 'chosen:updated' );
		},

		/**
		 * Update a filter
		 * @param {Object} event  Change event
		 * @param {Object} params Event parameters
		 */
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
	 * @constructor module:Tests.TestStatus
	 * @extends {Backbone.Model}
	 */
	Tests.TestStatus = Backbone.Model.extend( /** @lends module:Tests.TestStatus.prototype */ {
		/**
		 * Default values
		 * @default
		 * @type {Object}
		 */
		defaults: {
			passed: 0,
			failed: 0,
			time: 0,
			start: 0,
			completed: 0,
			total: 0,

			running: false
		},

		/**
		 * Initialize a test status
		 */
		initialize: function() {
			this.listenTo( Tests.controller, 'tests:stop', this.stop, this );
			this.listenTo( Tests.controller, 'tests:update', this.update, this );
		},

		/**
		 * Reset a test status
		 */
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

		/**
		 * Update a test status
		 * @param {Object} data State object
		 */
		update: function( data ) {
			if ( typeof data == 'object' && data.state === 'done' ) {
				var model = this.toJSON();

				this.set( {
					completed: model.completed + 1,
					failed: model.failed + ( data.failed || 0 ) + ( data.broken ? 1 : 0 ),
					passed: model.passed + ( data.passed || 0 ),
					time: new Date() - model.start
				} );
			}
		},

		/**
		 * Set a test status as started
		 * @param {Number} total Total test count
		 */
		start: function( total ) {
			this.reset();
			this.set( {
				running: true,
				total: total
			} );
		},

		/**
		 * Set a test status as stopped
		 */
		stop: function() {
			this.set( 'running', false );
		}
	} );

	/**
	 * Test status view
	 * @constructor module:Tests.TestStatusView
	 * @extends {Marionette.ItemView}
	 */
	Tests.TestStatusView = Marionette.ItemView.extend( /** @lends module:Tests.TestStatusView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#test-status',

		/**
		 * Test status view class name
		 * @default
		 * @type {String}
		 */
		className: 'test-status',

		/**
		 * Template helpers
		 * @type {module:Common.templateHelpers}
		 */
		templateHelpers: App.Common.templateHelpers,

		/**
		 * Initialize a test status view
		 */
		initialize: function() {
			this.listenTo( this.model, 'change', this.render, this );
		},

	} );

	/**
	 * Tests header view
	 * @constructor module:Tests.TestHeaderView
	 * @extends {Marionette.LayoutView}
	 */
	Tests.TestHeaderView = Marionette.LayoutView.extend( /** @lends module:Tests.TestHeaderView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#test-header',

		/**
		 * Test header view class name
		 * @default
		 * @type {String}
		 */
		className: 'row',

		/**
		 * Test header layout regions
		 * @default
		 * @type {Object}
		 */
		regions: {
			left: '.header-left',
			right: '.header-right'
		},

		/**
		 * UI element binding
		 * @default
		 * @type {Object}
		 */
		ui: {
			'run': '.run-button',
			'create': '.create-button'
		},

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'click @ui.run': 'onClickRun',
			'click @ui.create': 'onClickCreateJob'
		},

		/**
		 * Template helpers
		 * @type {module:Common.templateHelpers}
		 */
		templateHelpers: App.Common.templateHelpers,

		/**
		 * Initialize a test header view
		 */
		initialize: function() {
			this.listenTo( Tests.controller, 'tests:start', function() {
				this.updateButtons( false );
			} );

			this.listenTo( Tests.controller, 'tests:stop', function() {
				this.updateButtons( true );
			} );
		},

		/**
		 * Update test header buttons
		 * @param {Boolean} enabled Enabled flag
		 */
		updateButtons: function( enabled ) {
			this.ui.run
				.attr( 'title', ( enabled ? 'Start' : 'Stop' ) + ' tests' )
				.find( 'span' )
				.toggleClass( 'glyphicon-play', enabled )
				.toggleClass( 'glyphicon-stop', !enabled );

			this.ui.create.attr( 'disabled', !enabled );
		},

		/**
		 * Handle click on the run button
		 */
		onClickRun: function() {
			Tests.controller.runTests();
		},

		/**
		 * Handle click on the "Create job" button
		 */
		onClickCreateJob: function() {
			Tests.controller.showCreateJob();
		}
	} );

	/**
	 * Test result model
	 * @constructor module:Tests.Result
	 * @extends {Backbone.Model}
	 */
	Tests.Result = Backbone.Model.extend( /** @lends module:Tests.Result.prototype */ {
		/**
		 * Default values
		 * @default
		 * @type {Object}
		 */
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

		/**
		 * Reset a result
		 */
		reset: function() {
			this.set( this.defaults );
		},

		/**
		 * Parse result data
		 * @param  {Object} data Result data
		 * @return {Object}
		 */
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

		/**
		 * Update a result
		 * @param {Object} data Result data
		 */
		update: function( data ) {
			this.set( this.parse( data ) );
		},

		/**
		 * Collect errors from a result
		 * @param  {Object} data Result data
		 * @return {Array}
		 */
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

		/**
		 * Check if a test was slow
		 * @param  {Object}  data Result data
		 * @return {Boolean}
		 */
		isSlow: function( data ) {
			// average duration above the threshold
			return ( Math.round( data.duration / data.total ) > bender.config.slowAvgThreshold ) ||
				// total duration above the threshold
				( data.duration > bender.config.slowThreshold );
		}
	} );

	/**
	 * Test model
	 * @constructor module:Tests.Test
	 * @extends {Backbone.Model}
	 */
	Tests.Test = Backbone.Model.extend( /** @lends module:Tests.Test.prototype */ {
		/**
		 * Default values
		 * @default
		 * @type {Object}
		 */
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

		/**
		 * Parse test data
		 * @param  {Object} data Test data
		 * @return {Object}
		 */
		parse: function( data ) {
			data.result = new Tests.Result( this.attributes, {
				parse: true
			} );

			return data;
		},

		/**
		 * Return a result for a test
		 * @return {module:Tests.Result}
		 */
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
	 * @constructor module:Tests.TestList
	 * @extends {Backbone.Collection}
	 */
	Tests.TestList = Backbone.Collection.extend( /** @lends module:Tests.TestList.prototype */ {
		/**
		 * Test list model class
		 * @type {module:Tests.Test}
		 */
		model: Tests.Test
	} );

	/**
	 * Tests and filtered tests collections
	 * @constructor module:Tests.Tests
	 * @extends {Backbone.Model}
	 */
	Tests.Tests = Backbone.Model.extend( /** @lends module:Tests.Tests.prototype */ {
		/**
		 * URL to the tests API
		 * @default
		 * @type {String}
		 */
		url: '/tests',

		/**
		 * Default values
		 * @default
		 * @type {Object}
		 */
		defaults: {
			tests: null,
			filtered: null
		},

		/**
		 * Test exclude filters
		 * @type {Object}
		 */
		excludes: {},

		/**
		 * Test filters
		 * @type {Object}
		 */
		filters: {},

		/**
		 * Initialize a model
		 */
		initialize: function() {
			this.listenTo( Tests.controller, 'tests:filter', this.setFilters, this );
			this.listenTo( Tests.controller, 'tests:start', this.clearResults, this );
			this.listenTo( Tests.controller, 'tests:stop', this.clearCurrentResult, this );
			this.listenTo( Tests.controller, 'tests:update', this.updateResult, this );

			this.set( 'tests', new Tests.TestList() );
			this.set( 'filtered', new Backbone.VirtualCollection( this.get( 'tests' ) ) );
		},

		/**
		 * Parse a response from the API
		 * @param  {Object} response Response data
		 * @return {Object}
		 */
		parse: function( response ) {
			response.tests = new Tests.TestList( response.test, {
				parse: false
			} );
			response.filtered = new Backbone.VirtualCollection( response.tests );

			delete response.test;

			return response;
		},

		/**
		 * Check if a test list needs filtering
		 * @return {Boolean}
		 */
		needsFiltering: function() {
			return _.some( this.filters, function( filter ) {
				return filter.length;
			} );
		},

		/**
		 * Set test filters
		 * @param {Array} filter Test filter
		 */
		setFilters: function( filter ) {
			var name;

			// reset filters
			for ( name in this.filters ) {
				this.filters[ name ] = [];
			}

			for ( name in this.excludes ) {
				this.excludes[ name ] = [];
			}

			_.each( filter, function( filter ) {
				filter = filter.split( ':' );

				var name = filter[ 0 ];

				if ( name.charAt( 0 ) === '-' ) {
					name = name.substr( 1 );

					if ( !this.excludes[ name ] ) {
						this.excludes[ name ] = [];
					}

					this.excludes[ name ].push( filter[ 1 ] );
				} else {
					if ( !this.filters[ name ] ) {
						this.filters[ name ] = [];
					}

					this.filters[ name ].push( filter[ 1 ] );
				}
			}, this );

			var filtered = this.get( 'filtered' );

			filtered.updateFilter( this.needsFiltering() && _.bind( this._filterFunc, this ) );
			this.trigger( 'change', this );
		},

		/**
		 * Inner filter function
		 * @param  {Object} item Test model
		 * @return {Boolean}
		 * @private
		 */
		_filterFunc: function( item ) {
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
						return item.result && !item.result.get( 'success' );
					} else if ( filter === 'passed' ) {
						return !item.result || item.result.get( 'success' );
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

		/**
		 * Convert attributes to an object
		 * @return {Object}
		 */
		toJSON: function() {
			var attr = this.attributes,
				json = {},
				name;

			for ( name in attr ) {
				json[ name ] = attr[ name ].toJSON();
			}

			return json;
		},

		/**
		 * Collect IDs of filtered tests
		 * @return {Array}
		 */
		getIds: function() {
			return this.get( 'filtered' ).map( function( item ) {
				return item.id;
			} );
		},

		/**
		 * Clear the result of current test
		 */
		clearCurrentResult: function() {
			var current = this.get( 'tests' ).get( bender.current );

			if ( current ) {
				current.getResult().reset();
				this.trigger( 'updateResult', bender.current );
			}
		},

		/**
		 * Clear all results
		 */
		clearResults: function() {
			this.get( 'tests' ).each( function( test ) {
				test.getResult().reset();
			} );

			this.trigger( 'change', this );
		},

		/**
		 * Update result of a test matching the given data
		 * @param {Object} data Result data
		 */
		updateResult: function( data ) {
			var model = this.get( 'tests' ).get( data.id );

			if ( model ) {
				model.getResult().update( data );
				this.trigger( 'updateResult', data.id );
			}
		},

		/**
		 * Get results for a test with the given ID
		 * @param  {String} id Test ID
		 * @return {module:Tests.Result}
		 */
		getResult: function( id ) {
			var model = this.get( 'tests' ).get( id );

			return model ? model.getResult() : null;
		}
	} );

	/**
	 * Test list view
	 * @constructor module:Tests.TestsView
	 * @extends {Marionette.ItemView}
	 */
	Tests.TestsView = Marionette.ItemView.extend( /** @lends module:Tests.TestsView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#tests',

		/**
		 * Test template builder
		 * @type {Function}
		 */
		testTemplate: null,

		/**
		 * Result template builder
		 * @type {Function}
		 */
		resultTemplate: null,

		/**
		 * Test list view class name
		 * @default
		 * @type {String}
		 */
		className: 'panel panel-default',

		/**
		 * Template helpers
		 * @type {Object}
		 */
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

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'click .result .result': 'showErrors'
		},

		/**
		 * UI element binding
		 * @default
		 * @type {Object}
		 */
		ui: {
			container: 'tbody'
		},

		/**
		 * Initialize a test list view
		 */
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

		/**
		 * Handle render event
		 */
		onRender: function() {
			this.ui.container.html( this.renderChildren() );
		},

		/**
		 * Render child views
		 * @return {String}
		 */
		renderChildren: function() {
			var filtered = this.model.get( 'filtered' ),
				html = [];

			filtered.each( function( test ) {
				html.push( this.testTemplate( _.extend( {}, test.toJSON(), this.templateHelpers ) ) );
			}, this );

			html = html.join( '' );

			return html;
		},

		/**
		 * Render a test result and scroll to that test
		 * @param  {String} id Test ID
		 */
		renderResult: function( id ) {
			var resultObj = this.model.get( 'tests' ).get( id ),
				row;

			if ( resultObj ) {
				var result = resultObj.get( 'result' ).toJSON();

				row = this.$el.find( '[data-id="' + id + '"]' );

				var s = result.style;

				row[ 0 ].className = s ? ' ' + s + ' bg-' + s + ' text-' + s : '';

				row.find( '.result' ).html( this.resultTemplate( _.extend( {}, result, this.templateHelpers ) ) );
				Tests.controller.scrollTo( row );

				this.logErrors( result );
			}
		},

		logErrors: function( result ) {
			var suiteName = result.displayName;
			_.each( result.errors, function( error ) {
				var logMessage = 'Test failed in: ' + suiteName + ' \n' +
					'Name: ' + error.name + '\n\n' +
					error.error;

				console.error( logMessage );
			} );
		},

		/**
		 * Show test error details
		 * @param {Object} event Click event
		 */
		showErrors: function( event ) {
			var id = $( event.target ).parent().parent().data( 'id' ),
				result = this.model.getResult( id );

			Tests.controller.showErrors( result );
		}
	} );

	/**
	 * New job model
	 * @constructor module:Tests.NewJob
	 * @extends {Backbone.Model}
	 */
	Tests.NewJob = Backbone.Model.extend( /** @lends module:Tests.NewJob.prototype */ {
		/**
		 * Default values
		 * @default
		 * @type {Object}
		 */
		defaults: {
			browsers: null,
			description: '',
			snapshot: false,
			tests: null,
			filter: null
		},

		/**
		 * URL to the jobs API
		 * @default
		 * @type {String}
		 */
		urlRoot: '/jobs',

		/**
		 * Initialize a new job model
		 */
		initialize: function() {
			this.set( 'browsers', [] )
				.set( 'tests', Tests.tests.getIds() )
				.set( 'filter', Tests.testFilter.get( 'filter' ) );
		},

		/**
		 * Validate a new job model
		 * @param  {Object} attrs Model attributes
		 * @return {String}
		 */
		validate: function( attrs ) {
			if ( !attrs.browsers.length ) {
				return 'No browsers specified for the job';
			}
			if ( !attrs.tests.length ) {
				return 'No tests specified for the job';
			}
		}
	} );

	/**
	 * Create a job view
	 * @constructor module:Tests.CreateJobView
	 * @extends {module:Common.ModalView}
	 */
	Tests.CreateJobView = App.Common.ModalView.extend( /** @lends module:Tests.CreateJobView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#create-job',

		/**
		 * UI element binding
		 * @default
		 * @type {Object}
		 */
		ui: {
			'browsers': '.job-browsers',
			'description': '.job-description',
			'create': '.create-button'
		},

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'change @ui.browsers': 'updateBrowsers',
			'change @ui.description': 'updateDescription',
			'click @ui.create': 'createJob',
			'change .take-snapshot': 'updateSnapshot',
			'click .add-captured-button': 'addCaptured',
			'click .add-all-button': 'addAll'
		},

		/**
		 * Initialize a create job view
		 */
		initialize: function() {
			this.listenTo( this.model, 'invalid', this.showError );
			this.listenTo( this.model, 'sync', this.handleCreate );
		},

		/**
		 * Handler render event
		 */
		onRender: function() {
			App.Common.ModalView.prototype.onRender.apply( this, arguments );

			this.ui.browsers.chosen( {
				width: '100%'
			} );
		},

		/**
		 * Update a list of browsers selected for a job
		 * @param {Object} event  Change event
		 * @param {Object} params Change event parameters
		 */
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

		/**
		 * Add captured browsers to the job
		 */
		addCaptured: function() {
			var current = this.model.get( 'browsers' ) || [],
				that = this,
				captured = [],
				toAdd;

			App.Browsers.browserList.each( function( browser ) {
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

		/**
		 * Add all browsers to the job
		 */
		addAll: function() {
			var that = this,
				browsers = [];

			App.Browsers.browserList.each( function( browser ) {
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

		/**
		 * Show error alert on model validation
		 * @param {Object} model Validated model
		 * @param {String} error Validation error message
		 */
		showError: function( model, error ) {
			this.ui.create.prop( 'disabled', false );
			App.Alerts.controller.add( 'danger', error, 'Error:' );
		},

		/**
		 * Handle new job creation
		 * @param {Object} model New job model
		 */
		handleCreate: function( model ) {
			App.Alerts.controller.add(
				'success',
				'New job added with ID: <a href="/#jobs/' + model.id + '">' + model.id + '</a>.',
				'Success!'
			);
			this.ui.create.prop( 'disabled', false );
			this.destroy();
		},

		/**
		 * Update a job description
		 * @param {Object} event Change event
		 */
		updateDescription: function( event ) {
			var description = $( event.target ).val().replace( /^\s+|\s+$/g, '' );
			this.model.set( 'description', description );
		},

		/**
		 * Update "snapshot" flag
		 * @param {Object} event Change event
		 */
		updateSnapshot: function( event ) {
			this.model.set( 'snapshot', event.target.checked );
		},

		/**
		 * Create a job
		 * @param {Object} event Mouse click event
		 */
		createJob: function( event ) {
			event.stopPropagation();
			this.ui.create.prop( 'disabled', true );
			this.model.save();
		}
	} );

	// initial document title
	var oldDocTitle = document.title;

	/**
	 * Tests controller
	 * @constructor module:Tests.Controller
	 * @extends {Marionette.Controller}
	 */
	Tests.Controller = Marionette.Controller.extend( /** @lends module:Tests.Controller.prototype */ {
		/**
		 * List filtered tests
		 * @param {Array} filter Test filter
		 */
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
				/**
				 * Tests were loaded
				 * @event module:Tests.Controller#tests:loaded
				 */
				Tests.controller.trigger( 'tests:loaded', data.tests, filter.split( ',' ) );

				App.content.show( new Tests.TestsView( {
					model: Tests.tests
				} ) );
			} );
		},

		/**
		 * Run filtered tests
		 */
		runTests: function() {
			var ids;

			if ( !Tests.testStatus.get( 'running' ) ) {
				ids = Tests.tests.getIds();

				if ( !ids.length ) {
					return App.Alerts.controller.add(
						'danger',
						'There are no tests to run, aborting.',
						'Error:'
					);
				}

				/**
				 * Testing started
				 * @event module:Tests.Controller#tests:start
				 */
				Tests.controller.trigger( 'tests:start' );

				// show all filtered
				Tests.testStatus.start( ids.length );
				bender.run( ids );
			} else {
				bender.stop();
				Tests.testStatus.stop();
			}
		},

		/**
		 * Scroll the page to the given element
		 * @param {Element} elem DOM element
		 */
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

		/**
		 * Show "create new job" modal
		 */
		showCreateJob: function() {
			App.modal.show(
				new Tests.CreateJobView( {
					model: new Tests.NewJob()
				} )
			);
		},

		/**
		 * Show result error details
		 * @param {module:Tests.Result} result Test result
		 */
		showErrors: function( result ) {
			if ( !result ) {
				return;
			}

			var errors = result.get( 'errors' );

			if ( !errors || !errors.length ) {
				return;
			}

			App.modal.show(
				new App.Common.TestErrorsView( {
					model: result
				} )
			);
		},

		/**
		 * Update a browser's window title on a test status change
		 * @param {Object} model Test status
		 */
		updateTitle: function( model ) {
			var status = '';

			if ( model && ( model = model.toJSON() ) && model.running ) {
				status = model.passed + ' passed / ' + model.failed + ' failed - ';
			}

			document.title = status + oldDocTitle;
		},

		/**
		 * Update the URL to reflect the changes in test filters
		 * @param {Array} filter Test filter
		 */
		updateURL: function( filter ) {
			App.navigate( 'tests/' + filter.join( ',' ), {
				trigger: false
			} );

			_.defer( function() {
				App.trigger( 'header:resize' );
			} );
		}
	} );

	/**
	 * Tests Router
	 * @constructor module:Tests.Router
	 * @extends {Marionette.AppRouter}
	 */
	Tests.Router = Marionette.AppRouter.extend( /** @lends module:Tests.Router.prototype */ {
		/**
		 * Router name
		 * @default
		 * @type {String}
		 */
		name: 'tests',

		/**
		 * Routes
		 * @default
		 * @type {Object}
		 */
		appRoutes: {
			'tests(/*filters)': 'listTests'
		}
	} );

	/**
	 * Initialize Tests module
	 */
	Tests.onBeforeStart = function() {
		/**
		 * Test controller
		 * @memberOf module:Tests
		 * @type {module:Tests.Controller}
		 */
		Tests.controller = new Tests.Controller();

		/**
		 * Test router
		 * @memberOf module:Tests
		 * @type {module:Tests.Router}
		 */
		Tests.router = new Tests.Router( {
			controller: Tests.controller
		} );

		// attach event listeners
		this.listenTo( Tests.controller, 'tests:filter', Tests.controller.updateURL );

		this.listenTo( Tests.controller, 'tests:start', function() {
			/**
			 * Disable tabs menu
			 * @event module:App#tabs:disable
			 */
			App.trigger( 'tabs:disable' );
		} );

		bender.on( 'update', function( data ) {
			/**
			 * Tests results updated
			 * @event module:Tests.Controller#tests:update
			 */
			Tests.controller.trigger( 'tests:update', data );
		} );

		bender.on( 'complete', function() {
			/**
			 * Tests stopped
			 * @event module:Tests.Controller#tests:stop
			 */
			Tests.controller.trigger( 'tests:stop' );
			/**
			 * Enable tabs menu
			 * @event module:App#tabs:enable
			 */
			App.trigger( 'tabs:enable' );
		} );

		// prevent from accidentally closing the dashboard while the tests are running
		$( window ).on( 'beforeunload', function() {
			if ( Tests.testStatus && Tests.testStatus.get( 'running' ) ) {
				return 'The tests are still running.';
			}
		} );
	};
} );
