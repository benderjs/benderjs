/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Creates HTTP Server
 */

'use strict';

var http = require( 'http' ),
	https = require( 'https' ),
	when = require( 'when' ),
	whenKeys = require( 'when/keys' ),
	whenReadFile = require( 'when/node' ).lift( require( 'graceful-fs' ).readFile ),
	path = require( 'path' ),
	connect = require( 'connect' ),
	logger = require( './logger' ).create( 'server', true );

/**
 * HTTP server manager
 * @module server
 */
module.exports = {

	name: 'server',

	attach: function() {
		logger.debug( 'attach' );

		var bender = this;

		bender.checkDeps( module.exports.name, 'middlewares' );

		// add Connect's middlewares
		bender.middlewares.add( 'urlencoded', connect.urlencoded, 0 );
		bender.middlewares.add( 'json', connect.json, 0 );

		/**
		 * HTTP server manager
		 * @type {module:server}
		 * @memberOf module:bender
		 * @name server
		 */
		bender.server = {};

		/**
		 * Create an instance of HTTP Server with WebSocket server attached to it
		 * @return {Object}
		 * @memberOf module:server
		 * @method create
		 */
		bender.server.create = function() {
			logger.debug( 'create' );

			var app = connect();

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

			if ( bender.conf.secure ) {
				if ( !bender.conf.privateKey || !bender.conf.certificate ) {
					logger.error( '\n\nYou need to configure "privateKey" and "certificate" options.' +
						'\nFor more information visit https://github.com/benderjs/benderjs/wiki/Configuration.' );
					process.exit( 1 );
				}

				return whenKeys.all( {
					key: whenReadFile( path.resolve( bender.conf.privateKey ) ),
					cert: whenReadFile( path.resolve( bender.conf.certificate ) )
				} ).then( function( opts ) {
					return https.createServer( opts, app );
				} );
			} else {
				return when.promise( function( resolve, reject ) {
					try {
						resolve( http.createServer( app ) );
					} catch ( e ) {
						reject( e );
					}
				} );
			}
		};
	}
};
