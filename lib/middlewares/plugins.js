/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Serves plugin files from the file system
 */

'use strict';

var logger = require( '../logger' ).create( 'middleware-plugins', true );

/**
 * Create a HTTP Handler serving plugin files from the file system
 * @return {Function}
 */
function build( bender ) {
	var pattern = /^\/(plugins)\//;

	return function( req, res, next ) {
		var path;

		function resume( err ) {
			/* istanbul ignore next */
			if ( err ) {
				if ( err.code !== 'ENOENT' ) {
					logger.error( err );
				}

				logger.debug( err );
			}

			next();
		}

		/* istanbul ignore if:not much to test */
		if ( req.method !== 'GET' || !pattern.test( req.url ) ) {
			return resume();
		}

		path = req.url.replace( pattern, '' );

		/* istanbul ignore next:untestable in a single environment without ugly hacks */
		// add a root to fix a plugin path on Unix systems
		if ( require( 'path' ).sep === '/' ) {
			path = '/' + path;
		}

		// do not serve files that were not meant to
		if ( !bender.plugins.checkFile( path ) ) {
			return resume();
		}

		// serve a file from the local file system
		bender.files.send( decodeURI( bender.utils.stripParams( path ) ), req, res ).catch( resume );
	};
}

module.exports = {
	name: 'bender-middleware-plugins',
	build: build
};
