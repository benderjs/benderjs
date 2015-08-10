/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for the Tabs module
 */

/* bender-include: %BASE_PATH%_mocks.js, %APPS_DIR%bender/js/tabs.js */

describe( 'Tabs', function() {
	describe( 'Tab', function() {
		it( 'should inherit from Backbone.Model', function() {
			var tab = new App.Tabs.Tab();

			expect( tab ).to.be.instanceof( Backbone.Model );
		} );

		it( 'should instantiate with default attributes', function() {
			var tab = new App.Tabs.Tab();

			expect( tab.toJSON() ).to.deep.equal( {
				id: '',
				label: '',
				active: false,
				disabled: false
			} );
		} );
	} );

	describe( 'TabList', function() {
		var sandbox = sinon.sandbox.create(),
			testItems = [ {
				id: 'foo',
				label: 'Foo'
			}, {
				id: 'bar',
				label: 'Bar'
			}, {
				id: 'baz',
				label: 'Baz'
			} ];

		afterEach( function() {
			sandbox.restore();
		} );

		it( 'should inherit from Backbone.Collection', function() {
			var list = new App.Tabs.TabList();

			expect( list ).to.be.instanceof( App.Tabs.TabList );
		} );

		it( 'should use Tabs.Tab class for models', function() {
			var list = new App.Tabs.TabList( testItems );

			expect( list.at( 0 ) ).to.be.instanceof( App.Tabs.Tab );
		} );

		it( 'should disable items on App#tabs:disable event', function() {
			var stub = sandbox.stub( App.Tabs.TabList.prototype, 'disableTabs' );

			new App.Tabs.TabList();

			App.trigger( 'tabs:disable' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should enable items on App#tabs:enable event', function() {
			var stub = sandbox.stub( App.Tabs.TabList.prototype, 'enableTabs' );

			new App.Tabs.TabList();

			App.trigger( 'tabs:enable' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should activate the given tab and deactivate the rest', function() {
			var list = new App.Tabs.TabList( testItems );

			list.each( function( item ) {
				expect( item.get( 'active' ) ).to.be.false();
			} );

			list.activateTab( 'bar' );

			expect( list.at( 0 ).get( 'active' ) ).to.be.false();
			expect( list.at( 1 ).get( 'active' ) ).to.be.true();
			expect( list.at( 0 ).get( 'active' ) ).to.be.false();
		} );

		it( 'should deactivate all tabs if no name was given', function() {
			var list = new App.Tabs.TabList( testItems );

			list.activateTab( 'bar' );

			expect( list.at( 1 ).get( 'active' ) ).to.be.true();

			list.activateTab();

			list.each( function( item ) {
				expect( item.get( 'active' ) ).to.be.false();
			} );
		} );

		it( 'should disable all tabs', function() {
			var list = new App.Tabs.TabList( testItems );

			list.each( function( item ) {
				expect( item.get( 'disabled' ) ).to.be.false();
			} );

			list.disableTabs();

			list.each( function( item ) {
				expect( item.get( 'disabled' ) ).to.be.true();
			} );
		} );

		it( 'should enable all tabs', function() {
			var list = new App.Tabs.TabList( testItems );

			list.each( function( item ) {
				item.set( 'disabled', true );
			} );

			list.enableTabs();

			list.each( function( item ) {
				expect( item.get( 'disabled' ) ).to.be.false();
			} );
		} );
	} );

	describe( 'TabView', function() {
		var sandbox = sinon.sandbox.create(),
			model = new App.Tabs.Tab( {
				id: 'foo',
				label: 'Foo'
			} );

		beforeEach( function() {
			App.navigate = function() {};
		} );

		afterEach( function() {
			sandbox.restore();

			delete App.navigate;
		} );

		it( 'should inherit from Marionette.ItemView', function() {
			var view = new App.Tabs.TabView( {
				model: model
			} );

			expect( view ).to.be.instanceof( Marionette.ItemView );
		} );

		it( 'should use "#tab" template', function() {
			var view = new App.Tabs.TabView( {
				model: model
			} );

			view.render();

			var a = view.$el.find( 'a' );

			expect( a ).to.have.length( 1 );

			expect( a[ 0 ].href ).to.match( /#foo$/ );
			expect( a.text() ).to.equal( 'Foo' );
		} );

		it( 'should have a default tag name - "LI"', function() {
			var view = new App.Tabs.TabView( {
				model: model
			} );

			view.render();

			expect( view.el.tagName ).to.equal( 'LI' );
		} );

		it( 'should bind UI events', function() {
			var stub = sandbox.stub( App.Tabs.TabView.prototype, 'navigate' ),
				view = new App.Tabs.TabView( {
					model: model
				} );

			view.render();
			view.$el.find( 'a' ).click();

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should bind to the model changes to update the tab state', function() {
			var stub = sandbox.stub( App.Tabs.TabView.prototype, 'changeState' );

			new App.Tabs.TabView( {
				model: model
			} );

			model.trigger( 'change' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should call the App to navigate to the model route', function() {
			var stub = sandbox.stub( App, 'navigate' ),
				view = new App.Tabs.TabView( {
					model: model
				} );

			view.navigate( {} );

			expect( stub.calledOnce ).to.be.true();
			expect( stub.calledWith( 'foo' ) ).to.be.true();
		} );

		it( 'shouldn\'t call the App to navigate to the model route when the model is disabled', function() {
			var stub = sandbox.stub( App, 'navigate' ),
				view = new App.Tabs.TabView( {
					model: model.clone()
				} );

			view.model.set( 'disabled', true );

			view.navigate( {
				preventDefault: function() {}
			} );

			expect( stub.called ).to.be.false();
		} );

		it( 'should update the tab class name to reflect the model state', function() {
			var clone = model.clone(),
				view = new App.Tabs.TabView( {
					model: clone
				} );

			view.render();

			expect( view.$el.hasClass( 'active' ) ).to.be.false();
			expect( view.$el.hasClass( 'disabled' ) ).to.be.false();

			clone.set( 'active', true );

			expect( view.$el.hasClass( 'active' ) ).to.be.true();

			clone.set( 'disabled', true );

			expect( view.$el.hasClass( 'disabled' ) ).to.be.true();
		} );
	} );

	describe( 'TabListView', function() {
		it( 'should inherit from Marionette.CollectionView', function() {
			var view = new App.Tabs.TabListView();

			expect( view ).to.be.instanceof( Marionette.CollectionView );
		} );

		it( 'should use Tabs.TabView class for child views', function() {
			var view = new App.Tabs.TabListView( {
				collection: new App.Tabs.TabList( [ {
					id: 'foo',
					label: 'Foo'
				} ] )
			} );

			view.render();

			expect( view.children.findByIndex( 0 ) ).to.be.instanceof( App.Tabs.TabView );
		} );

		it( 'should use the default tag name - "UL"', function() {
			var view = new App.Tabs.TabListView();

			view.render();

			expect( view.el.tagName ).to.equal( 'UL' );
		} );

		it( 'should use the default class names', function() {
			var view = new App.Tabs.TabListView();

			view.render();

			expect( view.$el.hasClass( 'nav' ) ).to.be.true();
			expect( view.$el.hasClass( 'nav-tabs' ) ).to.be.true();
			expect( view.$el.hasClass( 'nav-justified' ) ).to.be.true();
		} );
	} );

	describe( 'onStart', function() {
		var sandbox = sinon.sandbox.create();

		afterEach( function() {
			sandbox.restore();
			delete App.Tabs.tabList;
			App.tabs.empty();
		} );

		it( 'should create a tab list', function() {
			App.Tabs.onStart();

			expect( App.Tabs.tabList ).to.have.length( 3 );
		} );

		it( 'should show a tab list view in the App\'s tabs region', function() {
			var stub = sandbox.stub( App.tabs, 'show' );

			App.Tabs.onStart();

			expect( stub.calledOnce ).to.be.true();

			var view = stub.args[ 0 ][ 0 ];

			expect( view ).to.be.instanceof( App.Tabs.TabListView );
			expect( view.collection ).to.equal( App.Tabs.tabList );
		} );

		it( 'should listen to the Backbone router and activate a proper tab', function() {
			var stub = sandbox.stub( App.Tabs.TabList.prototype, 'activateTab' );

			App.Tabs.onStart();

			Backbone.history.trigger( 'route', {
				name: 'tests'
			} );

			expect( stub.called ).to.be.true();
			expect( stub.calledWith( 'tests' ) ).to.be.true();
		} );
	} );
} );
