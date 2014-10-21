/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Builds test context, serves test assets
 */

'use strict';

var path = require( 'path' ),
	url = require( 'url' ),
	_ = require( 'lodash' ),
	logger = require( '../logger' ).create( 'middleware-tests', true ),
	redirPattern;

/**
 * Create a HTTP handler that servers test context and files
 * @return {Function}
 */
function build( bender ) {
	return function( req, res, next ) {
		var parsed = url.parse( req.url ),
			file,
			ext,
			id;

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
		// skip other request types
		if ( req.method !== 'GET' ) {
			return resume();
		}

		// list all of the tests
		if ( req.url === '/tests' ) {
			return bender.tests
				.list()
				.done( function( data ) {
					bender.utils.renderJSON( res, {
						test: data.map( function( test ) {
							return _.pick( test, [ 'id', 'group', 'tags', 'unit', 'manual' ] );
						} )
					} );
				}, resume );
		}

		// test id without a search string
		file = parsed.pathname.substr( 1 );

		// redirect to the dashboard to list the test for given path
		if ( redirPattern.test( req.url ) && bender.tests.checkPath( req.url.substr( 1 ) ) ) {

			/* istanbul ignore else */
			if ( file.charAt( file.length - 1 ) === '/' ) {
				file = file.substr( 0, file.length - 1 );
			}

			res.writeHead( 302, {
				Location: '/#tests/path:/' + file
			} );

			return res.end();
		}

		// serve a test page both for .js and .html extensions
		ext = path.extname( file );
		id = decodeURIComponent( ( ext === '.js' || ext === '.html' ) ? file.replace( ext, '' ) : file );

		// add a search string to test id (used by i.e. jQuery plugin)
		if ( parsed.search ) {
			id += parsed.search;
		}

		// remove "&" at the end of the URL
		if ( id.substr( -1 ) === '&' ) {
			id = id.slice( 0, -1 );
		}

		bender.tests
			.get( id )
			.done( function( test ) {
				// host assets from the test's directory
				if ( !test ) {
					return bender.tests.checkPath( file ) ?
						// serve a file from the local file system
						bender.files.send( bender.utils.stripParams( file ), req, res, function( err ) {
							/* istanbul ignore next */
							resume( ( err && err.code !== 'EISDIR' ) ? err : null );
						} ) :
						resume();
				}

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
	build: build,
	init: function( done ) {
		redirPattern = new RegExp( '^\/(?:' + this.conf.basePaths.join( '|' ) + ')(.*)\/$', 'i' );
		done();
	}
};
