/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Alerts module
 */

/*global $ */

describe( 'App', function() {
	var sandbox = sinon.sandbox.create(),
		oldHash = window.location.hash;

	afterEach( function() {
		sandbox.restore();
		Backbone.history.stop();
		App.$body = null;
		App.$navbar = null;
		App.off( 'header:update', App.onHeaderUpdate );
		App.off( 'header:resize', App.onHeaderResize );
		App.content.off( 'show', App.onContentShow );
		App.content.empty();
		$( window ).unbind( 'resize', App.onWindowResize );
		$( window ).unbind( 'scroll', App.onWindowScroll );

		window.location.hash = oldHash;
	} );

	it( 'should be an instance of Marionette.Application', function() {
		expect( App ).to.be.instanceof( Marionette.Application );
	} );

	it( 'should navigate to a route', function() {
		var stub = sandbox.stub( Backbone.history, 'navigate' );

		App.navigate( 'jobs' );

		expect( stub.calledOnce ).to.be.true();
		expect( stub.calledWith( 'jobs', {
			trigger: true
		} ) );
	} );

	it( 'should accept options while navigating to a route', function() {
		var stub = sandbox.stub( Backbone.history, 'navigate' );

		App.navigate( 'jobs', {
			trigger: false
		} );

		expect( stub.calledOnce ).to.be.true();
		expect( stub.calledWith( 'jobs', {
			trigger: false
		} ) );
	} );

	it( 'should return the current route', function() {
		expect( App.getCurrentRoute() ).to.equal( Backbone.history.fragment );
	} );

	it( 'should show an error view', function() {
		var headerStub = sandbox.stub( App.header, 'empty' ),
			contentStub = sandbox.stub( App.content, 'show' ),
			errorViewStub = sandbox.stub( App.Common, 'ErrorView' );

		App.showError( 404, 'Not found' );

		expect( headerStub.calledOnce ).to.be.true();
		expect( contentStub.calledOnce ).to.be.true();
		expect( errorViewStub.calledOnce ).to.be.true();
		expect( errorViewStub.calledWith( {
			code: 404,
			message: 'Not found'
		} ) ).to.be.true();
	} );

	it( 'should show a confirmation popup', function() {
		var modalStub = sandbox.stub( App.modal, 'show' ),
			confirmStub = sandbox.stub( App.Common, 'ConfirmView' ),
			options = {
				message: 'foo',
				callback: function() {}
			};

		App.showConfirmPopup( options );

		expect( modalStub.calledOnce ).to.be.true();
		expect( confirmStub.calledOnce ).to.be.true();
		expect( confirmStub.calledWith( options ) ).to.be.true();
	} );

	it( 'should show a "disconnected" popup', function() {
		var modalStub = sandbox.stub( App.modal, 'show' ),
			disconnectedStub = sandbox.stub( App.Common, 'DisconnectedView' );

		App.showDisconnectedPopup();

		expect( modalStub.calledOnce ).to.be.true();
		expect( disconnectedStub.calledOnce ).to.be.true();
	} );

	it( 'should hide a disconnected popup', function() {
		var spy = sandbox.spy( App.modal, 'empty' );

		App.modal.show( new App.Common.DisconnectedView() );

		App.hideDisconnectedPopup();

		expect( spy.called ).to.be.true();

		// don't throw any errors while trying to hide a hidden popup
		expect( function hideAgain() {
			App.hideDisconnectedPopup();
		} ).to.not.throw();
	} );

	it( 'should start Backbone routing on startup', function() {
		var stub = sandbox.stub( Backbone.history, 'start' );

		App.start();

		expect( stub.calledOnce ).to.be.true();
	} );

	it( 'should navigate to the "tests" route on startup', function() {
		var stub = sandbox.stub( App, 'navigate' );

		window.location.hash = '';

		App.start();

		window.location.hash = '';

		expect( stub.calledOnce ).to.be.true();
		expect( stub.calledWith( 'tests' ) ).to.be.true();
	} );

	it( 'should create references to "body" and ".navbar" elements', function() {
		App.start();

		expect( App.$body ).to.have.length( 1 );
		expect( App.$navbar ).to.have.length( 1 );
	} );

	it( 'should call App.onContentShow on content show events', function() {
		var stub = sandbox.stub( App, 'onContentShow' );

		App.start();
		App.content.trigger( 'show' );

		expect( stub.calledOnce ).to.be.true();
	} );

	it( 'should call App.onHeaderUpdate on header:update events', function() {
		var stub = sandbox.stub( App, 'onHeaderUpdate' );

		App.start();
		App.trigger( 'header:update' );

		expect( stub.calledOnce ).to.be.true();
	} );

	it( 'should call App.onHeaderResize on header:resize events', function() {
		var stub = sandbox.stub( App, 'onHeaderResize' );

		App.start();
		App.trigger( 'header:resize' );

		expect( stub.calledOnce ).to.be.true();
	} );

	it( 'should call App.onWindowResize on the window\'s resize events', function() {
		var stub = sandbox.stub( App, 'onWindowResize' );

		App.start();
		$( window ).trigger( 'resize' );

		expect( stub.calledOnce ).to.be.true();
	} );

	it( 'should call App.onWindowScroll on the window\'s scroll events', function() {
		var stub = sandbox.stub( App, 'onWindowScroll' );

		App.start();
		$( window ).trigger( 'scroll' );

		expect( stub.calledOnce ).to.be.true();
	} );

	it( 'should trigger header events on content show', function() {
		var updateSpy = sandbox.spy(),
			resizeSpy = sandbox.spy();

		App.once( 'header:update', updateSpy );
		App.once( 'header:resize', resizeSpy );

		App.start();
		App.onContentShow();

		expect( updateSpy.calledOnce ).to.be.true();
		expect( resizeSpy.calledOnce ).to.be.true();
		expect( resizeSpy.calledWith( 42 ) ).to.be.true();
	} );

	it( 'should trigger the header resize event on the window resize', function() {
		var spy = sandbox.spy();

		App.once( 'header:resize', spy );

		App.start();
		App.onWindowResize();

		expect( spy.calledOnce ).to.be.true();
		expect( spy.calledWith( 42 ) ).to.be.true();
	} );

	it( 'should toggle show/hide the fake header on the window resize', function() {
		var stub = sandbox.stub( App, '_toggleHeader' );

		App.start();
		App.onWindowResize();

		expect( stub.calledOnce ).to.be.true();
	} );

	it( 'should toggle show/hide the fake header on the window scroll', function() {
		var stub = sandbox.stub( App, '_toggleHeader' );

		App.onWindowScroll();

		expect( stub.calledOnce ).to.be.true();
	} );

	it( 'should create a fixed header clone', function() {
		var view = new( Marionette.ItemView.extend( {
			template: '#fixed-tmpl'
		} ) )();

		App.start();
		App.content.show( view );

		expect( App.$fixedHeader ).to.be.ok();
		expect( App.$fixedHeader.find( 'th' ) ).to.have.length( 2 );
	} );

	it( 'should show the fixed header clone when the window is scrolled', function() {
		var view = new( Marionette.ItemView.extend( {
			template: '#fixed-tmpl'
		} ) )();

		App.start();
		App.content.show( view );

		view.$el.height( 9999 );

		$( document.body ).scrollTop( 0 );

		expect( App.$fixedHeader.hasClass( 'hidden' ) ).to.be.true();

		App.$body.height( 10 );
		App.$body.scrollTop( 999 );
		App.$body.trigger( 'scroll' );
		expect( App.$fixedHeader.hasClass( 'hidden' ) ).to.be.false();
		App.$body.height( 'auto' );
	} );

	it( 'should hide the fixed header clone when the window is scrolled', function() {
		var view = new( Marionette.ItemView.extend( {
			template: '#fixed-tmpl'
		} ) )();

		App.start();
		App.content.show( view );

		App.$fixedHeader.removeClass( 'hidden' );

		$( window ).trigger( 'scroll' );

		expect( App.$fixedHeader.hasClass( 'hidden' ) ).to.be.true();
	} );

	it( 'should replace the fixed header\'s content if contentOnly flag is enabled', function() {
		var view = new( Marionette.ItemView.extend( {
			template: '#fixed-tmpl'
		} ) )();

		App.start();
		App.content.show( view );

		var fixedHeader = App.$fixedHeader;

		App.onHeaderUpdate( true );

		expect( App.$fixedHeader ).to.equal( fixedHeader );
	} );

	it( 'should set the body\'s padding to the given value', function() {
		App.start();
		App.onHeaderResize( 10 );

		expect( App.$body.css( 'paddingTop' ) ).to.equal( '11px' );
	} );

	it( 'should take the navbar\'s height to set the body\'s padding', function() {
		App.start();
		App.onHeaderResize();

		expect( App.$body.css( 'paddingTop' ) ).to.equal( '43px' );
	} );

	describe( 'ModalRegion', function() {
		it( 'should inherit from Marionette.Region', function() {
			var region = new App.ModalRegion();

			expect( region ).to.be.instanceof( Marionette.Region );
		} );

		it( 'should point to #modal element', function() {
			var region = new App.ModalRegion();

			expect( region.el.id ).to.equal( 'modal' );
		} );

		it( 'should empty itself on "hidden.bs.modal" event', function() {
			var stub = sandbox.stub( App.ModalRegion.prototype, 'empty' ),
				region = new App.ModalRegion();

			region.$el.trigger( 'hidden.bs.modal' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should hide Bootstrap modal on a child view destroy', function() {
			var region = new App.ModalRegion(),
				stub = sandbox.stub( region.$el, 'modal' ),
				childView = new Backbone.View();

			region.show( childView );

			childView.trigger( 'destroy' );

			expect( stub.calledWith( 'hide' ) ).to.be.true();
		} );

		it( 'should display Bootstrap modal while showing a child view', function() {
			var region = new App.ModalRegion(),
				stub = sandbox.stub( region.$el, 'modal' ),
				childView = new Backbone.View();

			region.show( childView );

			expect( stub.calledWith( {
				backdrop: 'static',
				show: true
			} ) ).to.be.true();
		} );

		// run this test only if the window if focused
		window[ ( document.hasFocus && document.hasFocus() ) ? 'it' : 'xit' ](
			'should focus the first button in the shown child view',
			function() {
				var region = new App.ModalRegion(),
					childView = new Backbone.View();

				childView.$el.html( '<button id="foo">Foo</button><button id="bar">Bar</button>' );

				region.show( childView );

				expect( childView.$el.find( '#foo' ).is( ':focus' ) ).to.be.true();
			}
		);

		it( 'should hide Bootstrap modal when emptied', function() {
			var region = new App.ModalRegion(),
				stub = sandbox.stub( region.$el, 'modal' ),
				childView = new Backbone.View();

			region.show( childView );
			region.empty( childView );

			expect( stub.called ).to.be.true();
			expect( stub.calledWith( 'hide' ) ).to.be.true();
		} );
	} );
} );
