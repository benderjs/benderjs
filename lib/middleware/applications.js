'use strict';

/**
 * @file Serves or proxies application files
 */
var request = require( 'request' ),
	path = require( 'path' ),
	send = require( 'send' ),
	logger = require( './../logger' );

/**
 * Create a HTTP handler serving/proxying application files
 * @return {Function}
 */
function create( bender ) {
	var pattern = /^\/apps\/([\w\-_%]+\/)([\w\/\.\-_%]+)$/;

	return function( req, res, next ) {
		var match = pattern.exec( req.url ),
			filePath,
			app;

		function resume( err ) {
			if ( err && err.code !== 'ENOENT' ) {
				logger.error( err );
			}

			next();
		}

		// url matches /apps/<appname> and there's an app with given url
		if ( match && ( app = bender.applications.findOne( 'url', match[ 1 ] ) ) ) {
			filePath = match[ 2 ];

			if ( app.proxy ) {
				// proxy request to external server
				req.pipe( request( app.proxy + filePath ) ).pipe( res );
			} else {
				// server file from local file system
				send( req, path.normalize( filePath ) )
					.root( path.resolve( app.path ) )
					.on( 'error', resume )
					.pipe( res );
			}
			// nothing to do here
		} else {
			next();
		}
	};
}

module.exports = {
	name: 'bender-middleware-applications',
	create: create
};
