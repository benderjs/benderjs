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
		 * Status view tag anme
		 * @default
		 * @type {String}
		 */
		tagName: 'span',

		/**
		 * Initialize status view
		 */
		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
		},

		/**
		 * Render status view
		 */
		render: function() {
			var status = this.model.get( 'status' );

			this.el.innerHTML = status;
			this.el.className = 'label label-' + ( status === 'connected' ? 'success' :
				status === 'reconnecting' ? 'warning' : 'danger' );
		}
	} );

	/**
	 * Initialize Sockets module
	 */
	App.on( 'before:start', function() {
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

		// expose socket.io emit method
		Sockets.emit = socket.emit;

		socket.on( 'connect', function() {
			socket.emit( 'register' );
			Sockets.socketStatus.setStatus( 'connected' );
			App.hideDisconnectedPopup();
		} );

		function handleDisconnect() {
			Sockets.socketStatus.setStatus( 'disconnected' );
			App.showDisconnectedPopup();
		}

		socket.on( 'disconnect', handleDisconnect );

		App.socketStatus.show( new Sockets.SocketStatusView( {
			model: Sockets.socketStatus
		} ) );

		$( window ).on( 'beforeunload', function() {
			socket.removeListener( 'disconnect', handleDisconnect );
			socket.disconnect();
		} );
	} );
} );
