/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Serves or proxies application files
 */

'use strict';

var request = require( 'request' ),
	path = require( 'path' ),
	logger = require( './../logger' ).create( 'middleware-applications', true );

/**
 * Create a HTTP handler serving/proxying application files
 * @return {Function}
 */
function build( bender ) {
	var pattern = /^\/apps\/([\w\-_%]+\/)([\w\/\.\-_%\?=&]+)$/;

	return function( req, res, next ) {
		var match = pattern.exec( req.url ),
			filePath,
			app;

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

		/* istanbul ignore else:not much to test */
		// url matches /apps/<appname> and there's an app with given url
		if ( match && ( app = bender.applications.findOne( 'url', match[ 1 ] ) ) ) {
			filePath = match[ 2 ];

			if ( app.proxy ) {
				// proxy request to external server
				req.pipe( request( app.proxy + filePath ) ).pipe( res );
			} else {
				// serve a file from the local file system
				bender.files.send( path.resolve( app.path, filePath ), req, res ).catch( resume );
			}
			// nothing to do here
		} else {
			resume();
		}
	};
}

module.exports = {
	name: 'bender-middleware-applications',
	build: build
};
