/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Serves files from the file system
 */

'use strict';

var send = require( 'send' ),
	logger = require( '../logger' );

/**
 * Create a HTTP Handler serving files from the file system
 * @return {Function}
 */
function create( bender ) {
	var pattern = /^\/(plugins)\//;

	return function( req, res, next ) {
		var path;

		function resume( err ) {
			/* istanbul ignore next:not much to test */
			if ( err && err.code !== 'ENOENT' ) {
				logger.error( err );
			}
			next();
		}

		/* istanbul ignore if:not much to test */
		if ( req.method !== 'GET' || !pattern.test( req.url ) ) {
			return resume();
		}

		path = req.url.replace( pattern, '' );

		/* istanbul ignore next:untestable in single environment without ugly hacks */
		// add root to fix plugin path on Unix systems
		if ( require( 'path' ).sep === '/' ) {
			path = '/' + path;
		}

		// do not serve files that weren't meant to
		if ( !bender.plugins.checkFile( path ) ) {
			return resume();
		}

		send( req, path )
			.on( 'error', resume )
			.pipe( res );
	};
}

module.exports = {
	name: 'bender-middleware-plugins',
	create: create
};
