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
		capturePattern = /^\/capture(?:\/)?(\w+)?$/,
		statics = path.resolve( __dirname, '../../static/' );

	return function( req, res, next ) {
		var sendOpt = {
				root: statics
			},
			match;

		function resume( err ) {
			/* istanbul ignore next:not much to test */
			if ( err && err.code !== 'ENOENT' ) {
				logger.error( err );
			}
			next();
		}

		// serve dashboard page
		if ( req.url === '/' ) {
			return send( req, 'index.html', sendOpt )
				.on( 'error', resume )
				.pipe( res );
		}

		// redirect to capture page
		// recognize a mode
		if ( ( match = capturePattern.exec( req.url ) ) ) {
			res.writeHead( 302, {
				Location: '/clients/' + uuid() + ( match[1] ? '#' + match[ 1 ] : '' )
			} );
			return res.end();
		}

		// serve capture page
		if ( clientPattern.test( req.url ) ) {
			return send( req, 'capture.html', sendOpt )
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
