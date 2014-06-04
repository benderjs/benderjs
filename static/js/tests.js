App.module( 'Tests', function( Tests, App, Backbone ) {
	'use strict';

	/**
	 * Tests Router
	 */
	Tests.Router = Marionette.AppRouter.extend( {
		name: 'tests',

		appRoutes: {
			'tests': 'listTests'
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
			running: false
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
				this.increment( 'passed', data.passed );
				this.increment( 'failed', data.failed );
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
		}
	} ) )();

	/**
	 * Tests header view
	 */
	Tests.TestHeaderView = Backbone.Marionette.ItemView.extend( {
		template: '#test-header',
		className: 'row',

		ui: {
			'run': '.run-button',
			'filter': '.tag-filter',
			'clear': '.clear-filter'
		},

		events: {
			'click @ui.run': 'runTests',
			'change @ui.filter': 'updateFilter'
		},

		templateHelpers: {
			timeToText: function( ms ) {
				var h, m, s;

				s = Math.floor( ms / 1000 );
				ms %= 1000;
				m = Math.floor( s / 60 );
				s %= 60;
				h = Math.floor( m / 60 );
				m %= 60;

				return ( h ? ( h + 'h ' ) : '' ) +
					( m ? ( ( m < 10 ? '0' : '' ) + m + 'm ' ) : '' ) +
					( s ? ( ( s < 10 ? '0' : '' ) + s + 's ' ) : '' ) +
					( ms < 10 ? '00' : ms < 100 ? '0' : '' ) + ms + 'ms';
			},

			getPercent: function( completed, total ) {
				return ( total > 0 ? Math.ceil( completed / total * 100 ) : 0 ) + '%';
			}
		},

		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
		},

		onRender: function() {
			this.ui.filter.chosen( {
				width: '350px'
			} );

			App.$body.css( 'paddingTop', App.$navbar.height() + 1 + 'px' );
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

		updateFilter: function( event, params ) {
			var filter = this.model.get( 'filter' );

			if ( params.selected ) {
				filter.push( params.selected );
			} else if ( params.deselected ) {
				filter.splice( filter.indexOf( params.deselected ), 1 );
			}

			this.model.set( 'filter', filter );
			App.vent.trigger( 'tests:filter', this.model.get( 'filter' ) );
		}
	} );

	/**
	 * Test model
	 */
	Tests.Test = Backbone.Model.extend( {
		defaults: {
			id: '',
			group: '',
			tags: '',
			result: '',
			status: '',
			visible: true
		}
	} );

	/**
	 * Test view
	 */
	Tests.TestView = Backbone.Marionette.ItemView.extend( {
		template: '#test',
		tagName: 'tr',

		ui: {
			icon: '.glyphicon',
			result: '.result'
		},

		initialize: function() {
			this.listenTo( this.model, 'change', this.updateStatus );
		},

		updateStatus: function() {
			var model = this.model.toJSON();

			this.$el[ model.visible ? 'show' : 'hide' ]();

			this.el.className = model.status ?
				model.status + ' bg-' + model.status + ' text-' + model.status :
				'';

			this.ui.icon[ 0 ].className = 'glyphicon' + ( model.status ?
				' glyphicon-' + ( model.status === 'success' ? 'ok' :
					model.status === 'warning' ? 'forward' : 'remove' ) :
				'' );

			this.ui.result.text( model.result );

			// scroll window to make result visible if needed
			if ( model.result ) {
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
			}
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

		getTags: function( tests ) {
			var tags = [],
				negTags = [];

			_.each( tests, function( test ) {
				tags = tags.concat( test.tags.split( ', ' ) );
			} );

			tags = _.uniq( tags ).sort();

			negTags = _.map( tags, function( tag ) {
				return '-' + tag;
			} );

			tags = tags.concat( negTags );

			Tests.testStatus.set( 'tags', tags );
		},

		filterTests: function( filter ) {
			var includes = [],
				excludes = [];


			this.each( function( test ) {
				test.set( 'visible', true );
			} );

			if ( !filter ) {
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
				var tags = test.get( 'tags' ).split( ', ' ),
					result = true;

				if ( includes.length ) {
					result = _.any( tags, function( tag ) {
						return includes.indexOf( tag ) > -1;
					} );
				}

				if ( excludes.length ) {
					result = result && !_.any( tags, function( tag ) {
						return excludes.indexOf( tag ) > -1;
					} );
				}

				if ( !result ) {
					test.set( 'visible', result );
				}
			} );
		},

		getIds: function() {
			return this
				.filter( function( test ) {
					return test.get( 'visible' );
				} )
				.map( function( test ) {
					return test.get( 'id' );
				} );
		},

		update: function( data ) {
			var model,
				ignored;

			if ( typeof data == 'string' ) {
				model = this.get( data );

				if ( model ) {
					model.set( 'result', 'Running...' );
				}
			} else if ( typeof data == 'object' && data !== null ) {
				model = this.get( data.id );
				if ( model ) {
					ignored = data.passed === 0 && data.failed === 0 && data.ignored > 0;

					model
						.set( 'result', this.buildResult( data ) )
						.set( 'status', data.success ? ignored ? 'warning' : 'success' : 'danger' );
				}
			}
		},

		buildResult: function( data ) {
			var result = [];

			result.push( data.passed, 'passed', '/' );
			result.push( data.failed, 'failed' );
			if ( data.ignored ) {
				result.push( '/', data.ignored, 'ignored' );
			}
			result.push( 'in', data.duration + 'ms' );

			return result.join( ' ' );
		},

		clearCurrentResult: function() {
			var current = Tests.testsList.get( bender.current );
			if ( current ) {
				current.set( 'result', '' );
			}
		},

		clearResults: function() {
			this.each( function( test ) {
				test.set( 'result', '' ).set( 'status', '' );
			} );
		}
	} ) )();

	Tests.NoTestsView = Backbone.Marionette.ItemView.extend( {
		template: '#no-tests',
		tagName: 'tr'
	} );

	/**
	 * Test list view
	 */
	Tests.TestsListView = App.Common.TableView.extend( {
		template: '#tests',
		itemView: Tests.TestView,
		emptyView: Tests.NoTestsView
	} );

	/**
	 * Tests controller
	 * @type {Object}
	 */
	Tests.controller = {
		listTests: function() {
			App.header.show( new Tests.TestHeaderView( {
				model: Tests.testStatus
			} ) );

			App.content.show( new Tests.TestsListView( {
				collection: Tests.testsList
			} ) );

			Tests.testsList.fetch();
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

		bender.on( 'update', function( data ) {
			Tests.testStatus.update( data );
			Tests.testsList.update( data );
		} );

		bender.on( 'complete', function() {
			App.vent.trigger( 'tests:stop' );
		} );
	} );
} );
