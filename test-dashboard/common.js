/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Alerts module
 */

/*global App, bender, _ */

/* bender-include: %BASE_PATH%_mocks.js, %APPS_DIR%bender/js/common.js */

describe( 'Common', function() {
	describe( 'templateHelpers', function() {
		var th = App.Common.templateHelpers;

		describe( 'getTime', function() {
			it( 'should produce a human readable string from a timestamp', function() {
				var timestamp = Date.now() - 5000,
					result = th.getTime( timestamp );

				expect( result ).to.match( /few seconds ago/ );
			} );
		} );

		describe( 'getResultClass', function() {
			it( 'should produce a proper set of classes', function() {
				expect( th.getResultClass( {
					status: 1
				} ) ).to.equal( 'info bg-info text-info' );

				expect( th.getResultClass( {
					status: 2
				} ) ).to.equal( 'success bg-success text-success' );

				expect( th.getResultClass( {
					status: 3
				} ) ).to.equal( 'danger bg-danger text-danger' );

				expect( th.getResultClass( {
					status: 4
				} ) ).to.equal( 'warning bg-warning text-warning' );
			} );

			it( 'shouldn\'t include background style if noBackground flag', function() {
				expect( th.getResultClass( {
					status: 1
				}, true ) ).to.equal( 'info text-info' );

				expect( th.getResultClass( {
					status: 2
				}, true ) ).to.equal( 'success text-success' );

				expect( th.getResultClass( {
					status: 3
				}, true ) ).to.equal( 'danger text-danger' );

				expect( th.getResultClass( {
					status: 4
				}, true ) ).to.equal( 'warning text-warning' );
			} );
		} );

		describe( 'getResultMessage', function() {
			it( 'should produce a test result message', function() {
				var expected = [
					/Waiting\.\.\./,
					/Pending\.\.\./,
					/Passed in (.+)ms/,
					/Failed in (.+)ms/,
					/Ignored/,
					/Unknown/,
				];

				expected.forEach( function( message, i ) {
					expect( th.getResultMessage( {
						status: i,
						duration: 123
					} ) ).to.match( message );
				} );

				expect( th.getResultMessage( {
					status: 2
				} ) ).to.equal( 'Passed in ?ms' );
			} );
		} );

		describe( 'getResultIcon', function() {
			it( 'should produce a class for a test status icon', function() {
				var expected = [
					'glyphicon-time',
					'glyphicon-refresh',
					'glyphicon-ok',
					'glyphicon-remove',
					'glyphicon-forward'
				];

				expected.forEach( function( className, i ) {
					expect( th.getResultIcon( {
						status: i
					} ) ).to.equal( className );
				} );
			} );
		} );

		describe( 'timeToText', function() {
			it( 'should convert a timestamp to a human readable form', function() {
				expect( th.timeToText( 0 ) ).to.equal( '000ms' );
				expect( th.timeToText( 9 ) ).to.equal( '009ms' );
				expect( th.timeToText( 99 ) ).to.equal( '099ms' );
				expect( th.timeToText( 999 ) ).to.equal( '999ms' );
				expect( th.timeToText( 1000 ) ).to.equal( '01s 000ms' );
				expect( th.timeToText( 59999 ) ).to.equal( '59s 999ms' );
				expect( th.timeToText( 60000 ) ).to.equal( '01m 00s 000ms' );
				expect( th.timeToText( 3599999 ) ).to.equal( '59m 59s 999ms' );
				expect( th.timeToText( 3600000 ) ).to.equal( '1h 00m 00s 000ms' );
				expect( th.timeToText( 3599999999 ) ).to.equal( '999h 59m 59s 999ms' );
			} );
		} );

		describe( 'getPercent', function() {
			it( 'should return a percent string', function() {
				expect( th.getPercent( -1, -1 ) ).to.equal( '0%' );
				expect( th.getPercent( 1, -1 ) ).to.equal( '0%' );
				expect( th.getPercent( -1, 1 ) ).to.equal( '0%' );
				expect( th.getPercent( 0, 1 ) ).to.equal( '0%' );
				expect( th.getPercent( 1, 0 ) ).to.equal( '0%' );
				expect( th.getPercent( 1, 2 ) ).to.equal( '50%' );
				expect( th.getPercent( 2, 2 ) ).to.equal( '100%' );
			} );
		} );

		describe( 'isSlow', function() {
			it( 'should tell if a test was slow', function() {
				var slowAvg = bender.config.slowAvgThreshold,
					slow = bender.config.slowThreshold;

				expect( th.isSlow( {
					total: 5,
					duration: 6 * slowAvg
				} ) ).to.be.true();

				expect( th.isSlow( {
					total: 5,
					duration: 4 * slowAvg
				} ) ).to.be.false();

				expect( th.isSlow( {
					total: 5,
					duration: slow
				} ) ).to.be.true();

				expect( th.isSlow( {
					total: 5,
					duration: slow / 2
				} ) ).to.be.true();
			} );
		} );
	} );

	describe( 'ModalView', function() {
		it( 'should wrap a view with a Bootstrap wrapper', function() {
			var view = new App.Common.ModalView();

			expect( view.el.classList.contains( 'modal-content' ) ).to.be.true();

			App.modal.show( view );

			expect( view.el.classList.contains( 'modal-content' ) ).to.be.false();
			expect( view.el.classList.contains( 'modal-dialog' ) ).to.be.true();
		} );

		it( 'should use "#modal-tmpl" template', function() {
			var view = new App.Common.ModalView();

			App.modal.show( view );

			expect( view.el.textContent ).to.match( /Modal/ );
		} );

		it( 'should add "modal-lg" class when the size set to "big"', function() {
			var view = new( App.Common.ModalView.extend( {
				size: 'big'
			} ) )();

			App.modal.show( view );

			expect( view.el.classList.contains( 'modal-lg' ) ).to.be.true();
		} );

		it( 'should add "modal-sm" class when the size set to "small"', function() {
			var view = new( App.Common.ModalView.extend( {
				size: 'small'
			} ) )();

			App.modal.show( view );

			expect( view.el.classList.contains( 'modal-sm' ) ).to.be.true();
		} );
	} );

	describe( 'ConfirmView', function() {
		var sandbox = sinon.sandbox.create();

		afterEach( function() {
			sandbox.restore();
		} );

		it( 'should inherit from App.Common.ModalView', function() {
			var view = new App.Common.ConfirmView();

			expect( view ).to.be.instanceof( App.Common.ModalView );
		} );

		it( 'should have "modal-content" and "modal-confirm" classes', function() {
			var view = new App.Common.ConfirmView();

			expect( view.el.classList.contains( 'modal-content' ) ).to.be.true();
			expect( view.el.classList.contains( 'modal-confirm' ) ).to.be.true();
		} );

		it( 'should keep references to UI elements', function() {
			var view = new App.Common.ConfirmView();

			App.modal.show( view );

			expect( view.ui.submit.text() ).to.equal( 'Submit' );
		} );

		it( 'should run "submit" function on click on "submit" button', function() {
			var view = new App.Common.ConfirmView(),
				spy = sandbox.spy( view, 'submit' );

			App.modal.show( view );

			view.ui.submit.click();

			expect( spy.calledOnce ).to.be.true();
		} );

		it( 'should create a model with a default message while initializing a view', function() {
			var view = new App.Common.ConfirmView();

			expect( view.model ).to.be.instanceof( Backbone.Model );
			expect( view.model.toJSON() ).to.deep.equal( {
				message: 'Are you sure?',
				footer: true,
				title: false
			} );
		} );

		it( 'should set a message in a model to the given value', function() {
			var view = new App.Common.ConfirmView( {
				message: 'test message'
			} );

			expect( view.model ).to.be.instanceof( Backbone.Model );
			expect( view.model.toJSON() ).to.deep.equal( {
				message: 'test message',
				footer: true,
				title: false
			} );
		} );

		it( 'should set the callback to the given callback', function() {
			function callback() {}

			var view = new App.Common.ConfirmView( {
				callback: callback
			} );

			expect( view.callback ).to.equal( callback );
		} );

		it( 'should disable "submit" button on a submission', function() {
			var view = new App.Common.ConfirmView();

			App.modal.show( view );

			expect( view.ui.submit.prop( 'disabled' ) ).to.be.false();

			view.submit();

			expect( view.ui.submit.prop( 'disabled' ) ).to.be.true();
		} );

		it( 'should call a callback function on a submission and pass a function as an argument', function( done ) {
			var view = new App.Common.ConfirmView( {
				callback: callback
			} );

			function callback( handler ) {
				expect( handler ).to.be.a( 'function' );
				done();
			}

			App.modal.show( view );
			view.submit();
		} );

		it( 'should re-enable "submit" button after calling a handler function from a callback', function( done ) {
			var view = new App.Common.ConfirmView( {
				callback: callback
			} );

			function callback( handler ) {
				setTimeout( function() {
					expect( view.ui.submit.prop( 'disabled' ) ).to.be.true();

					handler();

					setTimeout( function() {
						expect( view.ui.submit.prop( 'disabled' ) ).to.be.false();
						done();
					} );
				}, 0 );
			}

			App.modal.show( view );

			view.submit();
		} );

		it( 'should destroy a view if doClose flag is set to true in closeHandler', function() {
			var view = new App.Common.ConfirmView();

			App.modal.show( view );

			expect( App.modal.hasView() ).to.be.true();

			view.closeHandler( true );

			expect( App.modal.hasView() ).to.be.false();
		} );
	} );

	describe( 'DisconnectedView', function() {
		it( 'should inherit from App.Common.ModalView', function() {
			var view = new App.Common.DisconnectedView();

			expect( view ).to.be.instanceof( App.Common.ModalView );
		} );

		it( 'should have name set to "disconnected-modal"', function() {
			var view = new App.Common.DisconnectedView();

			expect( view.name ).to.equal( 'disconnected-modal' );
		} );

		it( 'should initialize with a model', function() {
			var view = new App.Common.DisconnectedView();

			expect( view.model.toJSON() ).to.deep.equal( {
				message: 'You\'ve been disconnected from the server, reconnecting...',
				footer: false,
				title: false
			} );
		} );
	} );

	describe( 'TestErrorsView', function() {
		it( 'should inherit from App.Common.ModalView', function() {
			var view = new App.Common.TestErrorsView();

			expect( view ).to.be.instanceof( App.Common.ModalView );
		} );

		it( 'should use "test-errors" template', function() {
			var view = new App.Common.TestErrorsView();

			App.modal.show( view );

			expect( view.el.textContent ).to.match( /TestError/ );
		} );
	} );

	describe( 'TableView', function() {
		var testItems = [ {
				id: 1,
				name: 'foo'
			}, {
				id: 2,
				name: 'bar'
			}, {
				id: 3,
				name: 'baz'
			}, {
				id: 4,
				name: 'qux'
			}, {
				id: 5,
				name: 'quux'
			} ],
			TestItemView = Marionette.ItemView.extend( {
				template: '#test-item',
				tagName: 'tr'
			} );

		it( 'should have default class names', function() {
			var table = new App.Common.TableView( {
				template: '#test-table'
			} );

			expect( table.el.classList.contains( 'panel' ) ).to.be.true();
			expect( table.el.classList.contains( 'panel-default' ) ).to.be.true();
		} );

		it( 'should place children in "tbody" element', function() {
			var collection = new Backbone.Collection(),
				TableView = App.Common.TableView.extend( {
					collection: collection,
					childView: TestItemView,
					template: '#test-table'
				} ),
				table = new TableView();

			table.render();

			expect( table.$el.find( 'tbody' ).children() ).to.have.length( 0 );

			collection.add( testItems[ 0 ] );

			expect( table.$el.find( 'tbody' ).children() ).to.have.length( 1 );
		} );

		it( 'should render children on show', function() {
			var collection = new Backbone.Collection( testItems ),
				TableView = App.Common.TableView.extend( {
					collection: collection,
					childView: TestItemView,
					template: '#test-table'
				} ),
				table = new TableView();

			App.content.show( table );

			expect( table.$el.find( 'tbody' ).children() ).to.have.length( testItems.length );
		} );

		it( 'should include child view\'s classes while rendering', function() {
			var collection = new Backbone.Collection( [ testItems[ 0 ] ] ),
				ClassyTestItemView = TestItemView.extend( {
					className: 'foo bar'
				} ),
				TableView = App.Common.TableView.extend( {
					collection: collection,
					childView: ClassyTestItemView,
					template: '#test-table'
				} ),
				table = new TableView();

			table.render();

			var child = table.$el.find( 'tbody' ).children().eq( 0 );

			expect( child.hasClass( 'foo' ) ).to.be.true();
			expect( child.hasClass( 'bar' ) ).to.be.true();
		} );

		it( 'should include child view\'s attributes while rendering', function() {
			var collection = new Backbone.Collection( [ testItems[ 0 ] ] ),
				ClassyTestItemView = TestItemView.extend( {
					attributes: {
						style: 'background: red'
					}
				} ),
				TableView = App.Common.TableView.extend( {
					collection: collection,
					childView: ClassyTestItemView,
					template: '#test-table'
				} ),
				table = new TableView();

			table.render();

			var child = table.$el.find( 'tbody' ).children().eq( 0 );

			expect( child.css( 'background' ) ).to.match( /red/ );
		} );

		it( 'should throw an error if no child view specified', function() {
			var collection = new Backbone.Collection( testItems ),
				TableView = App.Common.TableView.extend( {
					collection: collection,
					template: '#test-table'
				} ),
				table = new TableView();

			expect( function() {
				table.render();
			} ).to.throw( 'A "childView" must be specified' );
		} );
	} );

	describe( 'DeferredFetchMixin', function() {
		var requests,
			sandbox,
			xhr;

		beforeEach( function() {
			sandbox = sinon.sandbox.create();
			xhr = sinon.useFakeXMLHttpRequest();

			requests = [];

			xhr.onCreate = function( req ) {
				requests.push( req );
			};
		} );

		afterEach( function() {
			xhr.restore();
			sandbox.restore();
		} );

		var DELAY = 100,
			TestModel = Backbone.Model.extend(
				_.extend( {}, App.Common.DeferredFetchMixin, {
					defaults: {
						foo: 'bar',
						baz: 0
					},
					fetchDelay: DELAY,
					oldFetch: Backbone.Model.prototype.fetch,
					url: '/test'
				} )
			);

		it( 'should throw an error if the oldFetch isn\'t overriden', function() {
			var TestModel = Backbone.Model.extend(
					_.extend( {}, App.Common.DeferredFetchMixin, {
						url: '/test'
					} )
				),
				model = new TestModel();

			expect( function() {
				model.fetch();
			} ).to.throw( Error, 'Please override "oldFetch" with the original class fetch' );
		} );

		it( 'should defer a subsequent fetch if the fetch timeout didn\'t expire yet', function( done ) {
			var model = new TestModel(),
				firstSpy = sandbox.spy(),
				secondSpy = sandbox.spy(),
				thirdSpy = sandbox.spy();

			// first fetch
			model.fetch( {
				success: firstSpy
			} );

			// the first request should be sent immediately
			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				id: 1,
				foo: 'qux',
				baz: 42
			} ) );

			// should respond to the first request right away
			expect( firstSpy.calledOnce ).to.be.true();

			// deferred fetch
			model.fetch( {
				success: secondSpy
			} );

			// shouldn't create a request at this point
			expect( requests ).to.have.length( 1 );

			// deferred fetch
			model.fetch( {
				success: thirdSpy
			} );

			// shouldn't create new requests at this point
			expect( requests ).to.have.length( 1 );

			setTimeout( function() {
				// should create a request when fetchDelay expires
				expect( requests ).to.have.length( 2 );

				requests[ 1 ].respond( 200, {
					'Content-Type': 'application/json'
				}, JSON.stringify( {
					id: 1,
					foo: 'quux',
					baz: 44
				} ) );

				// second spy shouldn't be called
				expect( secondSpy.calledOnce ).to.be.false();
				expect( thirdSpy.calledOnce ).to.be.true();

				done();
			}, DELAY );
		} );

		it( 'should allow to force fetching using "options.force = true" flag', function() {
			var model = new TestModel(),
				firstSpy = sandbox.spy(),
				secondSpy = sandbox.spy();

			// first fetch
			model.fetch( {
				success: firstSpy
			} );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				id: 1,
				foo: 'qux',
				baz: 42
			} ) );

			expect( firstSpy.calledOnce ).to.be.true();

			// forced deferred fetch
			model.fetch( {
				success: secondSpy,
				force: true
			} );

			// should create a request for the forced fetch
			expect( requests ).to.have.length( 2 );

			requests[ 1 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				id: 1,
				foo: 'quux',
				baz: 44
			} ) );

			expect( secondSpy.calledOnce ).to.be.true();
		} );

		// TODO Add tests for "deferred" API
	} );
} );
