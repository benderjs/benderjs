/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Creates HTTP Server
 */

'use strict';

var http = require( 'http' ),
	path = require( 'path' ),
	connect = require( 'connect' );

/**
 * @module server
 */
module.exports = {

	name: 'server',

	/**
	 * Attach module to Bender
	 */
	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'sockets', 'middlewares' );

		bender.server = {};
		/**
		 * Create an instance of HTTP Server with Web Socket attached to it
		 * @return {Object}
		 */
		bender.server.create = function() {
			var app = connect(),
				server = http.createServer( app );

			// attach Web Socket server to the existing HTTP server
			bender.sockets.attach( server );

			// enable connect's middleware
			app.use( connect.json() );
			app.use( connect.urlencoded() );

			// create middleware instances
			bender.middlewares.forEach( function( middleware ) {
				app.use( middleware( bender ) );
			} );

			// serve static files, e.g. client scripts and styles
			app.use( connect.static( path.resolve( __dirname, '../static/' ) ) );

			// serve 404 for unhandled requests
			app.use( function( req, res ) {
				res.writeHead( 404 );
				res.end( http.STATUS_CODES[ '404' ] );
			} );

			return server;
		};
	}
};
