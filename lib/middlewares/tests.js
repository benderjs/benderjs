/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Builds test context, serves test assets
 */

'use strict';

var path = require( 'path' ),
	url = require( 'url' ),
	ua = require( 'useragent' ),
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

		function error( err ) {
			logger.error( err );
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
				}, error );
		}

		// test id without a search string
		file = parsed.pathname.substr( 1 );

		// redirect to the dashboard to list the test for the given path
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
				function handleError( err ) {
					/* istanbul ignore next */
					if ( err && err.code !== 'EISDIR' && err.code !== 'ENOENT' ) {
						error( err );
					} else {
						resume();
					}
				}

				// build and serve a test page
				if ( test ) {
					test = _.cloneDeep( test );

					test.ua = ua.parse( req.headers[ 'user-agent' ] );

					bender.template.build( test )
						.done( function( content ) {
							bender.utils.renderHTML( res, content );
						}, error );
					// host assets from the test's directory
				} else {
					if ( !bender.tests.checkPath( file ) ) {
						return resume();
					}

					bender.files.send( bender.utils.stripParams( file ), req, res ).catch( handleError );
				}
			}, resume );
	};
}

module.exports = {
	name: 'bender-middleware-tests',
	build: build,
	init: function( done ) {
		var tests = this.conf.tests,
			basePaths = Object.keys( tests ).reduce( function( result, current ) {
				var group = tests[ current ];

				group.basePaths.forEach( function( path ) {
					/* istanbul ignore else */
					if ( result.indexOf( path ) === -1 ) {
						result.push( path );
					}
				} );

				return result;
			}, [] );

		// replace * and ** with their regex representations
		function replaceWildcards( path ) {
			return path
				.replace( /\*/g, '([^\/]*)' )
				.replace( /\*\*/g, '(.*)' )
				.replace( /\//g, '\/' );
		}

		// create a regular expresion used to test if a path points to a test directory
		redirPattern = new RegExp( '^\/(?:' + basePaths.map( replaceWildcards ).join( '|' ) + ')(.*)\/$', 'i' );

		done();
	}
};
