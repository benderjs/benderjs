/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Handles default HTTP routes
 */

'use strict';

var path = require( 'path' ),
	send = require( 'send' ),
	uuid = require( 'node-uuid' ).v4,
	logger = require( '../logger' ).create( 'middleware-default', true );

/**
 * Create HTTP Handler for default routes
 * @param {Object} bender Bender application
 * @return {Function}
 */
function build( bender ) {
	var clientPattern = /^\/clients\/[\w]{8}(-[\w]{4}){3}-[\w]{12}$/,
		statics = path.resolve( __dirname, '../../static/' );

	return function( req, res, next ) {
		function resume( err ) {
			/* istanbul ignore next:not much to test */
			if ( err && err.code !== 'ENOENT' ) {
				logger.error( String( err ) );
			}
			next();
		}

		// serve dashboard page
		if ( req.url === '/' ) {
			return send( req, 'index.html', {
					root: statics
				} )
				.on( 'error', resume )
				.pipe( res );
		}

		// redirect to capture page
		if ( req.url === '/capture' ) {
			res.writeHead( 302, {
				Location: '/clients/' + uuid()
			} );
			return res.end();
		}

		// serve capture page
		if ( clientPattern.test( req.url ) ) {
			return send( req, 'capture.html', {
					root: statics
				} )
				.on( 'error', resume )
				.pipe( res );
		}

		// serve Bender configuration file
		if ( req.url === '/js/bender-config.js' ) {
			return bender.utils.renderScript(
				res,
				'var BENDER_CONFIG = ' + JSON.stringify( bender.conf, null, '\t' ) + ';'
			);
		}

		resume();
	};
}

module.exports = {
	name: 'bender-middleware-default',
	build: build
};
