/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Builds test context, serves test assets
 */

'use strict';

var path = require( 'path' ),
	url = require( 'url' ),
	send = require( 'send' ),
	logger = require( '../logger' );

/**
 * Create a HTTP handler that servers test context and files
 * @return {Function}
 */
function create( bender ) {
	return function( req, res, next ) {
		var parsed = url.parse( req.url ),
			file,
			ext,
			id;

		function resume( err ) {
			if ( err && err.code !== 'ENOENT' ) {
				logger.error( err );
			}
			next();
		}

		if ( req.method !== 'GET' ) {
			return resume();
		}

		// serve list of all tests
		if ( req.url === '/tests' ) {
			console.time( 'list tests' );
			return bender.tests
				.list()
				.done( function( data ) {
					console.timeEnd( 'list tests' );
					bender.utils.renderJSON( res, {
						test: data
					} );
				}, resume );
		}

		// test id without search string
		file = parsed.pathname.substr( 1 );

		// serve test page both for .js and .html extension
		id = decodeURIComponent( ( ext = path.extname( file ) ) ? file.replace( ext, '' ) : file );

		// add search string to test id (used by i.e. jQuery plugin)
		if ( parsed.search ) {
			id += parsed.search;
		}

		// remove & at the end of url
		if ( id.substr( -1 ) === '&' ) {
			id = id.slice( 0, -1 );
		}

		console.time( 'get test' );
		bender.tests
			.get( id )
			.done( function( test ) {
				// host assets from the tests' directory
				if ( !test ) {
					return bender.tests.checkPath( file ) ?
						send( req, path.normalize( file ) ).on( 'error', resume ).pipe( res ) :
						resume();
				}

				console.timeEnd( 'get test' );

				bender.template
					.build( test )
					.done( function( content ) {
						bender.utils.renderHTML( res, content );
					}, resume );
			}, resume );
	};
}

module.exports = {
	name: 'bender-middleware-tests',
	create: create
};
