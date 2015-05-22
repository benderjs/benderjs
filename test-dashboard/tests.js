/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Browsers module
 */

/* bender-include: %BASE_PATH%_mocks.js, %APPS_DIR%bender/js/common.js, %APPS_DIR%bender/js/tests.js */


describe( 'Tests', function() {
	var sampleTests = [ {
		id: 'bar',
		group: 'Foo',
		tags: [ 'a', 'b' ],
		unit: true
	}, {
		id: 'foo/baz',
		group: 'Foo',
		tags: [ 'a', 'c' ],
		manual: true
	}, {
		id: 'foo/qux',
		group: 'Foo',
		tags: [ 'a', 'd' ],
		unit: true
	}, {
		id: 'quux/qux',
		group: 'Quux',
		tags: [ 'a', 'd' ],
		unit: true
	} ];

	describe( 'Filter', function() {
		var sandbox = sinon.sandbox.create();

		beforeEach( function() {
			App.Tests.controller = _.extend( {}, Backbone.Events );
		} );

		afterEach( function() {
			sandbox.restore();
			delete App.Tests.controller;
		} );

		it( 'should inherit from Backbone.Model', function() {
			var filter = new App.Tests.Filter();

			expect( filter ).to.be.instanceof( Backbone.Model );
		} );

		it( 'should instantiate with default attributes', function() {
			var filter = new App.Tests.Filter();

			expect( filter.toJSON() ).to.deep.equal( {
				filter: [],
				tests: null,
				tokens: null
			} );
		} );

		it( 'should save new tests and build new filters for those', function() {
			var tests = new Backbone.Collection( sampleTests ),
				filter = new App.Tests.Filter(),
				stub = sandbox.stub( App.Tests.Filter.prototype, 'buildTokens' );

			App.Tests.controller.trigger( 'tests:loaded', tests, [] );

			expect( filter.get( 'tests' ) ).to.equal( tests );
			expect( stub.calledOnce ).to.be.true();
			expect( stub.calledWith( [] ) ).to.be.true();
		} );

		it( 'should rebuild the tokens on the filter change', function() {
			var filter = new App.Tests.Filter(),
				stub = sandbox.stub( App.Tests.Filter.prototype, 'buildTokens' );

			filter.trigger( 'change:filter' );

			expect( stub.calledOnce ).to.be.true();
			expect( stub.calledWith( [] ) ).to.be.true();
		} );

		it( 'should trigger tests:filter event on the controller on the filter change', function() {
			var filter = new App.Tests.Filter( {
					tests: new Backbone.Collection()
				} ),
				spy = sandbox.spy();

			App.Tests.controller.on( 'tests:filter', spy );

			filter.trigger( 'change:filter' );

			expect( spy.calledOnce ).to.be.true();
			expect( spy.calledWith( [] ) ).to.be.true();
		} );

		it( 'should build tokens for the given tests and filter', function() {
			var tests = new Backbone.Collection( sampleTests ),
				filter = new App.Tests.Filter( {
					tests: tests
				} );

			sandbox.stub( filter, 'setFilter' );

			tests.at( 0 ).set( 'result', new Backbone.Model( {
				success: true
			} ) );

			tests.at( 1 ).set( 'result', new Backbone.Model( {
				success: false
			} ) );

			expect( filter.get( 'tokens' ) ).to.be.null();

			filter.buildTokens( [] );

			expect( filter.get( 'tokens' ) ).to.deep.equal( [
				'is:failed', 'is:passed', 'is:manual', 'is:unit',
				'group:Foo', 'group:Quux', 'name:bar', 'name:baz', 'name:qux',
				'path:/', 'path:/foo', 'path:/quux', 'tag:a', 'tag:b', 'tag:c', 'tag:d',
				'-group:Foo', '-group:Quux', '-name:bar', '-name:baz', '-name:qux',
				'-path:/', '-path:/foo', '-path:/quux', '-tag:a', '-tag:b', '-tag:c', '-tag:d'
			] );

			filter.buildTokens( [ 'is:manual' ] );

			expect( filter.get( 'tokens' ) ).to.deep.equal( [
				'is:failed', 'is:passed', 'is:manual', 'is:unit',
				'group:Foo', 'name:baz', 'path:/foo', 'tag:a', 'tag:c',
				'-group:Foo', '-name:baz', '-path:/foo', '-tag:a', '-tag:c'
			] );

			filter.buildTokens( [ 'is:unit' ] );

			expect( filter.get( 'tokens' ) ).to.deep.equal( [
				'is:failed', 'is:passed', 'is:manual', 'is:unit',
				'group:Foo', 'group:Quux', 'name:bar', 'name:qux', 'path:/', 'path:/foo', 'path:/quux',
				'tag:a', 'tag:b', 'tag:d', '-group:Foo', '-group:Quux', '-name:bar', '-name:qux',
				'-path:/', '-path:/foo', '-path:/quux', '-tag:a', '-tag:b', '-tag:d'
			] );

			filter.buildTokens( [ 'is:passed' ] );

			expect( filter.get( 'tokens' ) ).to.deep.equal( [
				'is:failed', 'is:passed', 'is:manual', 'is:unit',
				'group:Foo', 'group:Quux', 'name:bar', 'name:qux', 'path:/', 'path:/foo', 'path:/quux',
				'tag:a', 'tag:b', 'tag:d', '-group:Foo', '-group:Quux', '-name:bar', '-name:qux',
				'-path:/', '-path:/foo', '-path:/quux', '-tag:a', '-tag:b', '-tag:d'
			] );

			filter.buildTokens( [ 'is:failed' ] );

			expect( filter.get( 'tokens' ) ).to.deep.equal( [
				'is:failed', 'is:passed', 'is:manual', 'is:unit',
				'group:Foo', 'name:baz', 'path:/foo', 'tag:a', 'tag:c',
				'-group:Foo', '-name:baz', '-path:/foo', '-tag:a', '-tag:c'
			] );

			filter.buildTokens( [ 'name:bar' ] );

			expect( filter.get( 'tokens' ) ).to.deep.equal( [
				'is:failed', 'is:passed', 'is:manual', 'is:unit',
				'group:Foo', 'group:Quux', 'name:bar', 'name:baz', 'name:qux',
				'path:/', 'path:/foo', 'path:/quux', 'tag:a', 'tag:b', 'tag:c', 'tag:d',
				'-group:Foo', '-group:Quux', '-name:bar', '-name:baz', '-name:qux',
				'-path:/', '-path:/foo', '-path:/quux', '-tag:a', '-tag:b', '-tag:c', '-tag:d'
			] );
		} );

		it( 'should set the filter to the available values', function() {
			var tests = new Backbone.Collection( sampleTests ),
				filter = new App.Tests.Filter( {
					tests: tests
				} ),
				newFilter = [ 'is:passed', 'path:/foo', 'path:/unknown' ];

			filter.buildTokens( [] );
			filter.setFilter( newFilter );

			expect( filter.get( 'filter' ) ).to.deep.equal( [ 'is:passed', 'path:/foo' ] );
		} );

		it( 'should trigger update:filter after setting a new value', function() {
			var tests = new Backbone.Collection( sampleTests ),
				filter = new App.Tests.Filter( {
					tests: tests
				} ),
				newFilter = [ 'is:passed', 'path:/foo', 'path:/unknown' ],
				spy = sandbox.spy();

			filter.on( 'update:filter', spy );

			filter.buildTokens( [] );
			filter.setFilter( newFilter );

			expect( spy.called ).to.be.true();
			expect( spy.args[ 1 ][ 0 ] ).to.deep.equal( [ 'is:passed', 'path:/foo' ] );
		} );

		it( 'should trigger test:filter on the controller if there\'s no matching filters', function() {
			var tests = new Backbone.Collection( sampleTests ),
				filter = new App.Tests.Filter( {
					tests: tests
				} ),
				newFilter = [ 'path:/unknown' ],
				spy = sandbox.spy();

			App.Tests.controller.on( 'tests:filter', spy );

			filter.buildTokens( [] );
			filter.setFilter( newFilter );

			expect( spy.calledOnce ).to.be.true();
			expect( spy.args[ 0 ][ 0 ] ).to.deep.equal( [] );
		} );
	} );

	describe( 'FilterView', function() {
		var sandbox = sinon.sandbox.create();

		beforeEach( function() {
			App.Tests.controller = _.extend( {}, Backbone.Events );
		} );

		afterEach( function() {
			sandbox.restore();
			delete App.Tests.controller;
		} );

		it( 'should inherit from Marionette.ItemView', function() {
			var view = new App.Tests.FilterView( {
				model: new Backbone.Model()
			} );

			expect( view ).to.be.instanceof( Marionette.ItemView );
		} );

		it( 'should use #test-filter template', function() {
			var filter = new App.Tests.Filter( {
					tests: new Backbone.Collection( sampleTests )
				} ),
				view = new App.Tests.FilterView( {
					model: filter
				} );

			filter.buildTokens( [] );

			view.render();

			expect( view.$el.find( 'select' ) ).to.have.length( 1 );
		} );

		it( 'should add the default class name', function() {
			var filter = new App.Tests.Filter( {
					tests: new Backbone.Collection( sampleTests )
				} ),
				view = new App.Tests.FilterView( {
					model: filter
				} );

			filter.buildTokens( [] );

			view.render();

			expect( view.$el.hasClass( 'filter-form' ) ).to.be.true();
		} );

		it( 'should bind UI elements', function() {
			var filter = new App.Tests.Filter( {
					tests: new Backbone.Collection( sampleTests )
				} ),
				view = new App.Tests.FilterView( {
					model: filter
				} );

			filter.buildTokens( [] );

			view.render();

			expect( view.ui.filter ).to.have.length( 1 );
			expect( view.ui.filter[ 0 ].tagName ).to.equal( 'SELECT' );
		} );

		it( 'should bind UI events', function() {
			var filter = new App.Tests.Filter( {
					tests: new Backbone.Collection( sampleTests )
				} ),
				stub = sandbox.stub( App.Tests.FilterView.prototype, 'updateFilter' ),
				view = new App.Tests.FilterView( {
					model: filter
				} );

			filter.buildTokens( [] );

			view.render();

			view.ui.filter.trigger( 'change' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should re-render on the model tokens change', function() {
			var filter = new App.Tests.Filter( {
					tests: new Backbone.Collection( sampleTests )
				} ),
				stub = sandbox.stub( App.Tests.FilterView.prototype, 'render' );

			new App.Tests.FilterView( {
				model: filter
			} );

			filter.trigger( 'change:tokens' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should update on the model\'s filter update', function() {
			var filter = new App.Tests.Filter( {
					tests: new Backbone.Collection( sampleTests )
				} ),
				stub = sandbox.stub( App.Tests.FilterView.prototype, 'update' );

			new App.Tests.FilterView( {
				model: filter
			} );

			filter.trigger( 'update:filter' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should wrap the select with Chosen', function() {
			var filter = new App.Tests.Filter( {
					tests: new Backbone.Collection( sampleTests )
				} ),
				view = new App.Tests.FilterView( {
					model: filter
				} );

			view.render();

			expect( view.ui.filter.data( 'chosen' ) ).to.be.ok();
		} );

		it( 'should mark the selected tokens', function() {
			var filter = new App.Tests.Filter( {
					tests: new Backbone.Collection( sampleTests )
				} ),
				view = new App.Tests.FilterView( {
					model: filter
				} );

			view.render();

			filter.set( 'filter', [ 'is:passed', 'is:unit' ] );

			view.update();

			expect( view.$el.find( 'option[value="is:passed"]' ).prop( 'selected' ) ).to.be.true();
			expect( view.$el.find( 'option[value="is:failed"]' ).prop( 'selected' ) ).to.be.false();
			expect( view.$el.find( 'option[value="is:unit"]' ).prop( 'selected' ) ).to.be.true();
			expect( view.$el.find( 'option[value="is:manual"]' ).prop( 'selected' ) ).to.be.false();
		} );

		it( 'should update the model\'s filter', function() {
			var filter = new App.Tests.Filter( {
					tests: new Backbone.Collection( sampleTests )
				} ),
				view = new App.Tests.FilterView( {
					model: filter
				} );

			expect( filter.get( 'filter' ) ).to.deep.equal( [] );

			view.updateFilter( {}, {
				selected: 'is:passed'
			} );

			expect( filter.get( 'filter' ) ).to.deep.equal( [ 'is:passed' ] );

			view.updateFilter( {}, {} );

			expect( filter.get( 'filter' ) ).to.deep.equal( [ 'is:passed' ] );

			view.updateFilter( {}, {
				deselected: 'is:passed'
			} );

			expect( filter.get( 'filter' ) ).to.deep.equal( [] );
		} );
	} );
} );
