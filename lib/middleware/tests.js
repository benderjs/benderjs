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
			redirPattern = /^\/(.*)\/$/i,
			file,
			tag,
			ext,
			id;

		function resume( err ) {
			if ( err && err.code !== 'ENOENT' ) {
				logger.error( err );
			}
			next();
		}

		// skip other request types
		if ( req.method !== 'GET' ) {
			return resume();
		}

		// serve list of all tests
		if ( req.url === '/tests' ) {
			return bender.tests
				.list()
				.done( function( data ) {
					bender.utils.renderJSON( res, {
						test: data
					} );
				}, resume );
		}

		// redirect to dashboard to list the test for given path
		if ( redirPattern.test( req.url ) && bender.tests.checkPath( req.url ) ) {
			// get filter directory: /foo/bar/baz/ -> baz
			tag = req.url.split( '/' ).splice( -2, 1 )[ 0 ];

			res.writeHead( 302, {
				Location: '/#tests/' + tag
			} );

			return res.end();
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

		bender.tests
			.get( id )
			.done( function( test ) {
				// host assets from a test directory
				if ( !test ) {
					return bender.tests.checkFile( file ) ?
						send( req, path.normalize( file ) ).on( 'error', resume ).pipe( res ) :
						resume();
				}

				// server from the cache
				if ( ( file = bender.cache.getPath( test.id ) ) ) {
					send( req, file ).on( 'error', resume ).pipe( res );
					// write to the cache and render
				} else {
					bender.template
						.build( test )
						.then( function( data ) {
							return bender.cache.write( test.id, data );
						} )
						.done( function( content ) {
							bender.utils.renderHTML( res, content );
						}, resume );
				}
			}, resume );
	};
}

module.exports = {
	name: 'bender-middleware-tests',
	create: create
};
