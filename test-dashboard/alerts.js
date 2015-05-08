/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Alerts module
 */

/*global App */

/* bender-include: %BASE_PATH%_mocks.js, %APPS_DIR%bender/js/alerts.js */

describe( 'Alerts', function() {
	var sandbox = sinon.sandbox.create();

	beforeEach( function() {
		App.Alerts.TIMEOUT = 0;
		App.Alerts.alertList = new App.Alerts.AlertList();
		App.Alerts.controller = new App.Alerts.Controller();
	} );

	afterEach( function() {
		sandbox.restore();
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

	it( 'should automatically remove an alert after a timeout', function( done ) {
		App.Alerts.TIMEOUT = 10;

		App.Alerts.controller.add( 'success', 'message', 'title' );

		expect( App.Alerts.alertList ).to.have.length( 1 );

		setTimeout( function() {
			expect( App.Alerts.alertList ).to.have.length( 0 );
			done();
		}, 20 );
	} );

	it( 'should render an alert view', function() {
		App.alerts.show( new App.Alerts.AlertListView( {
			collection: App.Alerts.alertList
		} ) );

		App.Alerts.controller.add( 'success', 'message', 'title' );

		expect( App.alerts.currentView.children ).to.have.length( 1 );

		var alert = App.Alerts.alertList.at( 0 );
		var view = App.alerts.currentView.children.findByModel( alert );
		var text = view.el.textContent;

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
