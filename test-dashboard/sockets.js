/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Alerts module
 */

/* global $ */

/* bender-include: %BASE_PATH%_mocks.js, %APPS_DIR%bender/js/sockets.js */

describe( 'Sockets', function() {
	describe( 'SocketStatus', function() {
		it( 'should inherit from Backbone.Model', function() {
			var status = new App.Sockets.SocketStatus();

			expect( status ).to.be.instanceof( Backbone.Model );
		} );

		it( 'should set the default status to "disconnected"', function() {
			var status = new App.Sockets.SocketStatus();

			expect( status.get( 'status' ) ).to.equal( 'disconnected' );
		} );

		it( 'should set the status with setStatus()', function() {
			var status = new App.Sockets.SocketStatus();

			status.setStatus( 'foo' );

			expect( status.get( 'status' ) ).to.equal( 'foo' );
		} );
	} );

	describe( 'SocketStatusView', function() {
		var sandbox = sinon.sandbox.create();

		afterEach( function() {
			sandbox.restore();
		} );

		it( 'should inherit from Backbone.View', function() {
			var view = new App.Sockets.SocketStatusView( {
				model: new App.Sockets.SocketStatus()
			} );

			expect( view ).to.be.instanceof( Backbone.View );
		} );

		it( 'should use the default tag name = "span"', function() {
			var view = new App.Sockets.SocketStatusView( {
				model: new App.Sockets.SocketStatus()
			} );

			view.render();

			expect( view.el.tagName ).to.equal( 'SPAN' );
		} );

		it( 'should re-render on the model changes', function() {
			var renderStub = sandbox.stub( App.Sockets.SocketStatusView.prototype, 'render' ),
				model = new App.Sockets.SocketStatus();

			new App.Sockets.SocketStatusView( {
				model: model
			} );

			model.trigger( 'change' );

			expect( renderStub.calledOnce ).to.be.true();
		} );

		it( 'should render according to the model', function() {
			var model = new App.Sockets.SocketStatus(),
				view = new App.Sockets.SocketStatusView( {
					model: model
				} );

			view.render();

			expect( view.$el.hasClass( 'label' ) ).to.be.true();

			expect( view.$el.text() ).to.equal( 'disconnected' );
			expect( view.$el.hasClass( 'label-danger' ) ).to.be.true();

			model.setStatus( 'reconnecting' );

			expect( view.$el.text() ).to.equal( 'reconnecting' );
			expect( view.$el.hasClass( 'label-warning' ) ).to.be.true();

			model.setStatus( 'connected' );

			expect( view.$el.text() ).to.equal( 'connected' );
			expect( view.$el.hasClass( 'label-success' ) ).to.be.true();
		} );
	} );

	describe( 'onStart', function() {
		var sandbox = sinon.sandbox.create(),
			oldIO = window.io;

		beforeEach( function() {
			window.io = {
				connect: function() {
					var socket = _.extend( {}, Backbone.Events );

					socket.emit = socket.trigger;
					socket.removeListener = socket.off;
					socket.disconnect = function() {};

					return socket;
				}
			};
		} );

		afterEach( function() {
			sandbox.restore();

			window.io = oldIO;

			delete App.Sockets.socketStatus;
			delete App.Sockets.socket;
		} );

		it( 'should connect to the WebSockets /dashboard channel', function() {
			var spy = sandbox.spy( window.io, 'connect' );

			App.Sockets.onStart();

			expect( spy.calledOnce ).to.be.true();
			expect( spy.args[ 0 ][ 0 ] ).to.equal( '/dashboard' );
		} );

		it( 'should create an instance of SocketStatus', function() {
			App.Sockets.onStart();
			expect( App.Sockets.socketStatus ).to.be.instanceof( App.Sockets.SocketStatus );
		} );

		it( 'should expose a socket', function() {
			App.Sockets.onStart();
			expect( App.Sockets.socket ).to.be.an( 'object' );
			expect( App.Sockets.socket.on ).to.be.a( 'function' );
		} );

		it( 'should bind to a socket\'s connect event', function() {
			var stub = sandbox.stub( App.Sockets, 'onConnect' );

			App.Sockets.onStart();
			App.Sockets.socket.emit( 'connect' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should bind to a socket\'s disconnect event', function() {
			var stub = sandbox.stub( App.Sockets, 'onDisconnect' );

			App.Sockets.onStart();
			App.Sockets.socket.emit( 'disconnect' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should show a socket status view', function() {
			var stub = sandbox.stub( App.socketStatus, 'show' );

			App.Sockets.onStart();

			expect( stub.calledOnce ).to.be.true();

			var view = stub.args[ 0 ][ 0 ];

			expect( view ).to.be.instanceof( App.Sockets.SocketStatusView );
			expect( view.model ).to.equal( App.Sockets.socketStatus );
		} );

		it( 'should disconnect a socket before a window unload', function() {
			App.Sockets.onStart();

			var removeStub = sandbox.stub( App.Sockets.socket, 'removeListener' ),
				disconnectStub = sandbox.stub( App.Sockets.socket, 'disconnect' );

			$( window ).trigger( 'beforeunload' );

			expect( removeStub.calledOnce ).to.be.true();
			expect( removeStub.calledWith( 'disconnect', App.Sockets.onDisconnect ) ).to.be.true();
			expect( disconnectStub.calledOnce ).to.be.true();
		} );
	} );

	describe( 'onConnect', function() {
		var sandbox = sinon.sandbox.create(),
			oldIO = window.io;

		beforeEach( function() {
			window.io = {
				connect: function() {
					var socket = _.extend( {}, Backbone.Events );

					socket.emit = socket.trigger;
					socket.removeListener = socket.off;
					socket.disconnect = function() {};

					return socket;
				}
			};

			App.showDisconnectedPopup = function() {};
			App.hideDisconnectedPopup = function() {};

			App.Sockets.onStart();
		} );

		afterEach( function() {
			sandbox.restore();

			window.io = oldIO;

			delete App.Sockets.socketStatus;
			delete App.Sockets.socket;
			delete App.showDisconnectedPopup;
			delete App.hideDisconnectedPopup;
		} );

		it( 'should should emit the "register" event', function() {
			var stub = sandbox.stub( App.Sockets.socket, 'emit' );

			App.Sockets.onConnect();

			expect( stub.calledOnce ).to.be.true();
			expect( stub.calledWith( 'register' ) ).to.be.true();
		} );

		it( 'should set the status to "connected"', function() {
			App.Sockets.onConnect();

			expect( App.Sockets.socketStatus.get( 'status' ) ).to.equal( 'connected' );
		} );

		it( 'should hide the "disconnected" popup', function() {
			var spy = sandbox.spy( App, 'hideDisconnectedPopup' );

			App.Sockets.onConnect();

			expect( spy.calledOnce ).to.be.true();
		} );
	} );

	describe( 'onDisconnect', function() {
		var sandbox = sinon.sandbox.create();

		beforeEach( function() {
			App.Sockets.socketStatus = new App.Sockets.SocketStatus( {
				status: 'connected'
			} );

			App.showDisconnectedPopup = function() {};
		} );

		afterEach( function() {
			sandbox.restore();

			delete App.Sockets.socketStatus;
			delete App.showDisconnectedPopup;
		} );
		it( 'should set the status to "connected"', function() {
			App.Sockets.onDisconnect();

			expect( App.Sockets.socketStatus.get( 'status' ) ).to.equal( 'disconnected' );
		} );

		it( 'should show the "disconnected" popup', function() {
			var spy = sandbox.spy( App, 'showDisconnectedPopup' );

			App.Sockets.onDisconnect();

			expect( spy.calledOnce ).to.be.true();
		} );
	} );
} );
