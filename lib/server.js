/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Creates HTTP Server
 */

'use strict';

var http = require( 'http' ),
	path = require( 'path' ),
	connect = require( 'connect' ),
	logger = require( './logger' ).create( 'server', true );

/**
 * @module server
 */
module.exports = {

	name: 'server',

	/**
	 * Attach the module to Bender
	 */
	attach: function() {
		logger.debug( 'attach' );

		var bender = this;

		bender.checkDeps( module.exports.name, 'middlewares' );

		// add Connect's middlewares
		bender.middlewares.add( 'urlencoded', connect.urlencoded, 0 );
		bender.middlewares.add( 'json', connect.json, 0 );

		bender.server = {};
		/**
		 * Create an instance of HTTP Server with WebSocket server attached to it
		 * @return {Object}
		 */
		bender.server.create = function() {
			logger.debug( 'create' );

			var app = connect(),
				server = http.createServer( app );

			// instantiate middlewares
			bender.middlewares.list().forEach( function( middleware ) {
				app.use( middleware( bender ) );
			} );

			// serve static files, e.g. client scripts and styles
			app.use( connect.static( path.resolve( __dirname, '../static/' ) ) );

			// send 404 for all unhandled requests
			app.use( function( req, res ) {
				res.writeHead( 404 );
				res.end( http.STATUS_CODES[ '404' ] );
			} );

			return server;
		};
	}
};
