/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages Web Sockets
 */

'use strict';

var sIO = require( 'socket.io' ),
	log = require( './logger' ).create( 'socket-io', {
		console: {
			level: 'info'
		}
	}, true );

/**
 * @module sockets
 */
module.exports = {

	name: 'sockets',

	/**
	 * Attach module to Bender
	 */
	attach: function() {
		var bender = this,
			sockets = bender.sockets = {};

		bender.checkDeps( module.exports.name, 'browsers' );

		/**
		 * Handle dashboard sockets
		 * @param {Object} socket Web Socket object
		 */
		function handleDashboard( socket ) {
			// dashboard registered
			socket.on( 'register', function() {
				bender.emit( 'dashboard:register', socket.id );
				socket.emit( 'browsers:update', bender.browsers.get() );
			} );

			// dashboard disconnected
			socket.on( 'disconnect', function() {
				bender.emit( 'dashboard:disconnect', socket.id );
			} );
		}

		/**
		 * Handle client sockets
		 * @param {Object} socket Web Socket object
		 */
		function handleClient( socket ) {
			var addr = socket.handshake.address || {};

			// client registered
			socket.on( 'register', function( client, callback ) {
				socket.clientId = client.id;

				sockets.clients[ client.id ] = socket;

				bender.emit( 'client:register', {
					id: client.id,
					ua: client.ua,
					addr: addr.address + ':' + addr.port
				} );

				/* istanbul ignore else */
				if ( typeof callback == 'function' ) {
					callback();
				}
			} );

			// client sent a result of a single test
			socket.on( 'result', function( data ) {
				bender.emit( 'client:result', {
					client: socket.clientId,
					result: data
				} );
			} );

			// client asks for a test
			socket.on( 'fetch', function( callback ) {
				var client = bender.browsers.clients.findOne( 'id', socket.clientId );

				if ( !client ) {
					return;
				}

				bender.emit( 'client:fetch', client, callback );
			} );

			// client completed testing
			socket.on( 'complete', function( data ) {
				var client;

				bender.browsers.setClientReady( socket.clientId );

				if ( !( client = bender.browsers.clients.findOne( 'id', socket.clientId ) ) ) {
					return;
				}

				data.client = client;

				bender.emit( 'client:complete', data );
			} );

			// client reported an error
			socket.on( 'err', function( error ) {
				bender.emit( 'client:error', error );
			} );

			// client sent a log message
			socket.on( 'log', function( msg ) {
				bender.emit( 'client:log', msg );
			} );

			// client disconnected
			socket.on( 'disconnect', function() {
				if ( socket.clientId ) {
					delete sockets.clients[ socket.clientId ];
				}

				bender.emit( 'client:disconnect', socket.clientId || 'unknown' );
			} );
		}

		/**
		 * Attach Web Sockets to existing HTTP Server
		 * @param {Object} server HTTP Server
		 */
		sockets.attach = function( server ) {
			var io = sIO.listen( server, {
				logger: log
			} );

			// socket namespace for dashboard
			sockets.dashboards = io.of( '/dashboard' );
			sockets.dashboards.on( 'connection', handleDashboard );

			// socket namespace for clients (browsers)
			sockets.browsers = io.of( '/client' );
			sockets.browsers.on( 'connection', handleClient );

			sockets.clients = {};
		};

		// listen for run event sent from jobs module
		bender.on( 'job:run', function( id, task ) {
			var socket = sockets.clients[ id ];

			if ( !socket ) {
				return;
			}

			bender.browsers.setClientReady( id, false );
			socket.emit( 'run', task );
		} );

		bender.on( 'job:update', function( jobId ) {
			sockets.dashboards.json.emit( 'job:update', jobId );
		} );
	}
};
