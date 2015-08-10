/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages WebSocket server
 */

'use strict';

var sIO = require( 'socket.io' ),
	log = require( './logger' ),
	logger = log.create( 'socket-io', true );

/**
 * WebSocket server manager
 * @module sockets
 */
module.exports = {

	name: 'sockets',

	attach: function() {
		logger.debug( 'attach' );

		var bender = this,
			/**
			 * WebSocket server manager
			 * @type {module:sockets}
			 * @memberOf module:bender
			 */
			sockets = bender.sockets = {};

		bender.checkDeps( module.exports.name, 'browsers' );

		/**
		 * Handle dashboard sockets
		 * @param {Object} socket WebSocket socket
		 * @private
		 */
		function handleDashboard( socket ) {
			// dashboard registered
			socket.on( 'register', function() {
				/**
				 * New dashboard registered
				 * @event module:bender#dashboard:register
				 * @type {String}
				 */
				bender.emit( 'dashboard:register', socket.id );
				socket.emit( 'browsers:update', bender.browsers.get() );
			} );

			// dashboard disconnected
			socket.on( 'disconnect', function() {
				/**
				 * Dashboard disconnected
				 * @event module:bender#dashboard:disconnect
				 * @type {String}
				 */
				bender.emit( 'dashboard:disconnect', socket.id );
			} );
		}

		/**
		 * Handle client sockets
		 * @param {Object} socket WebSocket socket
		 * @private
		 */
		function handleClient( socket ) {
			/* istanbul ignore next */
			var addr = socket.handshake.address || {};

			// client registered
			socket.on( 'register', function( client, callback ) {
				// force a client to reconnect if the ID is already in use
				if ( bender.browsers.clients.findOne( 'id', client.id ) && typeof callback == 'function' ) {
					return callback( false );
				}

				socket.clientId = client.id;

				sockets.clients[ client.id ] = socket;

				/**
				 * New client registered
				 * @event module:bender#client:register
				 * @type {Object}
				 */
				bender.emit( 'client:register', {
					id: client.id,
					ua: client.ua,
					mode: client.mode,
					addr: addr.address + ':' + addr.port
				} );

				/* istanbul ignore else */
				if ( typeof callback == 'function' ) {
					callback( true );
				}
			} );

			// client sent a result for a single test
			socket.on( 'result', function( data ) {
				var client = bender.browsers.clients.findOne( 'id', socket.clientId );

				if ( !client ) {
					return;
				}

				data.client = client;

				/**
				 * Client sends a test case result
				 * @event module:bender#client:result
				 * @type {Object}
				 */
				bender.emit( 'client:result', data );
			} );

			// client completed testing
			socket.on( 'complete', function( data ) {
				var client;

				if ( !( client = bender.browsers.clients.findOne( 'id', socket.clientId ) ) ) {
					return;
				}

				bender.browsers.setClientReady( socket.clientId );

				data.client = client;

				/**
				 * Client completed a test file
				 * @event module:bender#client:complete
				 * @type {Object}
				 */
				bender.emit( 'client:complete', data );
			} );

			// client reported an error
			// we use 'err' because of a conflict with a built-in 'error' event
			socket.on( 'err', function( error ) {
				/**
				 * Client sends an error
				 * @event module:bender#client:error
				 * @type {Object}
				 */
				bender.emit( 'client:error', error );
			} );

			// client sent a log message
			socket.on( 'log', function( msg ) {
				/**
				 * Client sends some logs
				 * @event module:bender#client:log
				 * @type {*}
				 */
				bender.emit( 'client:log', msg );
			} );

			// client disconnected
			socket.on( 'disconnect', function() {
				var client;

				if ( socket.clientId ) {
					delete sockets.clients[ socket.clientId ];
				}

				client = bender.browsers.clients.findOne( 'id', socket.clientId ) ||
					bender.browsers.unknown.findOne( 'id', socket.clientId );

				/**
				 * Client disconnected
				 * @event module:bender#client:disconnect
				 * @type {Object}
				 */
				bender.emit( 'client:disconnect', client || {
					id: 'unknown'
				} );
			} );
		}

		/**
		 * Attach WebSocket server to the existing HTTP Server
		 * @param {Object} server HTTP Server
		 * @memberOf module:sockets
		 * @method attach
		 */
		sockets.attach = function( server ) {
			logger.debug( 'attach to server' );

			var io = sIO.listen( server, {
				logger: logger,
				'destroy buffer size': Infinity
			} );

			// socket namespace for dashboards
			sockets.dashboards = io.of( '/dashboard' );
			sockets.dashboards.on( 'connection', handleDashboard );

			// socket namespace for clients (browsers)
			sockets.browsers = io.of( '/client' );
			sockets.browsers.on( 'connection', handleClient );

			sockets.clients = {};
		};

		// bind to application events
		bender.on( 'job:update', function( jobId ) {
			sockets.dashboards.json.emit( 'job:update', jobId );
		} );

		bender.on( 'browsers:change', function( browsers ) {
			bender.sockets.dashboards.json.emit( 'browsers:update', browsers );
		} );

		bender.on( 'client:change', function( client ) {
			bender.sockets.dashboards.json.emit( 'client:update', client );
		} );

		bender.on( 'client:run', function( id, test ) {
			/* istanbul ignore else */
			if ( bender.sockets.clients[ id ] ) {
				bender.sockets.clients[ id ].emit( 'run', test );
			}

			bender.browsers.setClientReady( id, false );
		} );
	}
};
