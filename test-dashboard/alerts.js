/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Alerts module
 */

/* bender-include: %BASE_PATH%_mocks.js, %APPS_DIR%bender/js/alerts.js */

describe( 'Alerts', function() {
	describe( 'Alert', function() {
		it( 'should inherit from Backbone.Model', function() {
			var alert = new App.Alerts.Alert();

			expect( alert ).to.be.instanceof( Backbone.Model );
		} );

		it( 'should instantiate with default attributes', function() {
			var alert = new App.Alerts.Alert();

			expect( alert.toJSON() ).to.deep.equal( {
				type: 'info',
				title: '',
				message: ''
			} );
		} );
	} );

	describe( 'AlertView', function() {
		var model = new Backbone.Model( {
			title: 'foo',
			message: 'bar',
			type: 'info'
		} );

		it( 'should inherit from Marionette.ItemView', function() {
			var view = new App.Alerts.AlertView();

			expect( view ).to.be.instanceof( Marionette.ItemView );
		} );

		it( 'should use "#alert" template', function() {
			var view = new App.Alerts.AlertView( {
				model: model
			} );

			view.render();

			expect( view.$el.find( 'strong' ).eq( 0 ).text() ).to.equal( 'foo' );
			expect( view.$el.text() ).to.match( /bar/ );

			view.destroy();
		} );

		it( 'should have default class name - "alert"', function() {
			var view = new App.Alerts.AlertView( {
				model: model
			} );

			view.render();

			expect( view.$el.hasClass( 'alert' ) ).to.be.true();

			view.destroy();
		} );

		it( 'should add alert type class on render', function() {
			var view = new App.Alerts.AlertView( {
				model: model
			} );

			view.render();

			expect( view.$el.hasClass( 'alert-info' ) ).to.be.true();

			view.destroy();
		} );

		it( 'should bind clicks on the document to destroy a view', function() {
			var view = new App.Alerts.AlertView( {
				model: model
			} );

			view.render();

			expect( view.isRendered ).to.be.true();

			$( document ).click();

			expect( view.isRendered ).to.be.false();
			expect( view.isDestroyed ).to.be.true();
		} );

		it( 'should unbind clicks on the document after destroying a view', function() {
			var view = new App.Alerts.AlertView( {
				model: model
			} );

			view.render();
			view.destroy();

			var spy = sinon.spy( view, 'destroy' );

			$( document ).click();

			expect( spy.called ).to.be.false();
			expect( view._destroy ).to.be.undefined();

			spy.restore();
		} );
	} );

	describe( 'AlertList', function() {
		it( 'should inherit from Backbone.Collection', function() {
			var list = new App.Alerts.AlertList();

			expect( list ).to.be.instanceof( Backbone.Collection );
		} );

		it( 'should use Alert class for models', function() {
			var list = new App.Alerts.AlertList( [ {
				type: 'info',
				title: 'foo',
				message: 'bar'
			} ] );

			expect( list.at( 0 ) ).to.be.instanceof( App.Alerts.Alert );
		} );

		it( 'should automatically remove an alert after a timeout', function( done ) {
			App.Alerts.TIMEOUT = 10;

			var list = new App.Alerts.AlertList();

			list.add( {
				type: 'info',
				title: 'foo',
				message: 'bar'
			} );

			expect( list ).to.have.length( 1 );

			setTimeout( function() {
				expect( list ).to.have.length( 0 );
				done();
			}, 20 );
		} );
	} );

	describe( 'AlertListView', function() {
		it( 'should inherit from Marionette.CollectionView', function() {
			var view = new App.Alerts.AlertListView();

			expect( view ).to.be.instanceof( Marionette.CollectionView );
		} );

		it( 'should use Alerts.AlertView for item views', function() {
			var view = new App.Alerts.AlertListView( {
				collection: new App.Alerts.AlertList( [ {
					type: 'info',
					title: 'foo',
					message: 'bar'
				} ] )
			} );

			view.render();

			var childView = view.children.findByIndex( 0 );

			expect( childView ).to.be.instanceof( App.Alerts.AlertView );
		} );

		it( 'should have a default class name - "alert-wrapper"', function() {
			var view = new App.Alerts.AlertListView();

			view.render();

			expect( view.$el.hasClass( 'alert-wrapper' ) ).to.be.true();
		} );
	} );

	describe( 'Controller', function() {
		var sandbox = sinon.sandbox.create();

		beforeEach( function() {
			App.Alerts.TIMEOUT = 0;
			App.Alerts.alertList = new App.Alerts.AlertList();
			App.Alerts.controller = new App.Alerts.Controller();
		} );

		afterEach( function() {
			sandbox.restore();

			delete App.Alerts.alertList;
			delete App.Alerts.controller;
			App.alerts.empty();
		} );

		it( 'should create an alert', function() {
			var spy = sandbox.spy( App.Alerts, 'Alert' );

			App.Alerts.controller.add( 'success', 'message', 'title' );

			expect( spy.getCall( 0 ).args[ 0 ] ).to.deep.equal( {
				message: 'message',
				title: 'title',
				type: 'success'
			} );
		} );

		it( 'should add an alert to Alerts.alertList', function() {
			var spy = sandbox.spy( App.Alerts.alertList, 'add' );

			App.Alerts.controller.add( 'success', 'message', 'title' );

			expect( spy.getCall( 0 ).args[ 0 ] ).to.be.instanceof( App.Alerts.Alert );
		} );

		it( 'should render an alert view', function() {
			App.alerts.show( new App.Alerts.AlertListView( {
				collection: App.Alerts.alertList
			} ) );

			App.Alerts.controller.add( 'success', 'message', 'title' );

			expect( App.alerts.currentView.children ).to.have.length( 1 );

			var alert = App.Alerts.alertList.at( 0 ),
				view = App.alerts.currentView.children.findByModel( alert ),
				text = view.el.textContent;

			expect( text.indexOf( 'message' ) ).to.be.above( -1 );
			expect( text.indexOf( 'title' ) ).to.be.above( -1 );
		} );

		it( 'should remove an alert view after a timeout', function( done ) {
			App.Alerts.TIMEOUT = 10;

			App.alerts.show( new App.Alerts.AlertListView( {
				collection: App.Alerts.alertList
			} ) );

			App.Alerts.controller.add( 'success', 'message', 'title' );

			expect( App.alerts.currentView.children ).to.have.length( 1 );

			setTimeout( function() {
				expect( App.alerts.currentView.children ).to.have.length( 0 );
				done();
			}, 20 );
		} );
	} );

	it( 'should initialize Alerts module', function() {
		expect( App.Alerts.alertList ).to.be.undefined();
		expect( App.Alerts.controller ).to.be.undefined();
		expect( App.alerts.hasView() ).to.be.false();

		App.Alerts.onStart();

		expect( App.Alerts.alertList ).to.be.instanceof( App.Alerts.AlertList );
		expect( App.Alerts.controller ).to.be.instanceof( App.Alerts.Controller );
		expect( App.alerts.hasView() ).to.be.true();
		expect( App.alerts.currentView ).to.be.instanceof( App.Alerts.AlertListView );
	} );
} );
