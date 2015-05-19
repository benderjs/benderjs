/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

/**
 * @module Sockets
 */
App.module( 'Sockets', function( Sockets, App, Backbone ) {
	'use strict';

	/**
	 * WebSocket status
	 * @constructor module:Sockets.SocketStatus
	 * @extends {Backbone.Model}
	 */
	Sockets.SocketStatus = Backbone.Model.extend( /** @lends module:Sockets.SocketStatus.prototype */ {
		/**
		 * Default values
		 * @default
		 * @type {Object}
		 */
		defaults: {
			status: 'disconnected'
		},

		/**
		 * Set the status
		 * @param {String} status Socket status
		 */
		setStatus: function( status ) {
			this.set( 'status', status );
		}
	} );

	/**
	 * Socket status view
	 * @constructor module:Sockets.SocketStatusView
	 * @extends {Backbone.View}
	 */
	Sockets.SocketStatusView = Backbone.View.extend( /** @lends module:Sockets.SocketStatusView.prototype */ {
		/**
		 * Status view tag name
		 * @default
		 * @type {String}
		 */
		tagName: 'span',

		/**
		 * Initialize a status view
		 */
		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
		},

		/**
		 * Render a status view, set the content and class names according to the model
		 */
		render: function() {
			var status = this.model.get( 'status' );

			this.el.innerHTML = status;
			this.el.className = 'label label-' + ( status === 'connected' ? 'success' :
				status === 'reconnecting' ? 'warning' : 'danger' );
		}
	} );

	/**
	 * Initialize Sockets module:
	 * - connect to the WebSockets /dashboard channel
	 * - create a socket status
	 * - bind to socket events
	 */
	Sockets.onStart = function() {
		var socket = io.connect( '/dashboard', {
			'reconnection delay': 2000,
			'reconnection limit': 2000,
			'max reconnection attempts': Infinity
		} );

		/**
		 * Socket status
		 * @memberOf module:Sockets
		 * @type {module:Sockets.SocketStatus}
		 */
		Sockets.socketStatus = new Sockets.SocketStatus();

		/**
		 * Reference to a WebSocket
		 * @type {WebSocket}
		 */
		Sockets.socket = socket;

		// bind to socket events
		socket.on( 'connect', Sockets.onConnect );
		socket.on( 'disconnect', Sockets.onDisconnect );

		// show a socket status view
		App.socketStatus.show( new Sockets.SocketStatusView( {
			model: Sockets.socketStatus
		} ) );

		$( window ).on( 'beforeunload', function() {
			socket.removeListener( 'disconnect', Sockets.onDisconnect );
			socket.disconnect();
		} );
	};

	/**
	 * Handle a socket connect event:
	 * - emit "register" event
	 * - set the status to "connected"
	 * - hide the "disconnected" popup
	 */
	Sockets.onConnect = function() {
		Sockets.socket.emit( 'register' );
		Sockets.socketStatus.setStatus( 'connected' );
		App.hideDisconnectedPopup();
	};

	/**
	 * Handle a socket disconnect event:
	 * - set the status to "disconnected"
	 * - show the "disconnected" popup
	 */
	Sockets.onDisconnect = function() {
		Sockets.socketStatus.setStatus( 'disconnected' );
		App.showDisconnectedPopup();
	};

	App.on( 'before:start', Sockets.onStart );
} );
