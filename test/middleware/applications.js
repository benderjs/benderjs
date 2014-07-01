/**
 * @file Tests for Applications middleware
 */

/*global describe, it, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	request = require( 'request' ),
	expect = require( 'chai' ).expect,
	request = require( 'request' ),
	rewire = require( 'rewire' ),
	http = require( 'http' ),
	path = require( 'path' ),
	fs = require( 'fs' ),
	applications = rewire( '../../lib/middleware/applications' ),
	appsModule = require( '../../lib/applications' ),
	serverModule = require( '../../lib/server' );

describe( 'Middleware - Applications', function() {
	var testFile = fs.readFileSync( path.resolve( 'test/fixtures/apps/test.js' ) ).toString(),
		tempServer = http.createServer( function( req, res ) {
			// serve test.js file
			if ( req.url === '/test.js' ) {
				res.writeHead( 200, {
					'Content-Type': 'application/javascript'
				} );
				res.end( testFile );
				// respond with 404
			} else {
				res.writeHead( 404 );
				res.end( http.STATUS_CODES[ '404' ] );
			}
		} ),
		bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'sockets' );
		bender.use( [ serverModule, appsModule ] );
		bender.init();
		bender.middleware = [ applications.create ];

	} );

	it( 'should expose create function', function() {
		expect( applications.create ).to.be.a( 'function' );
	} );

	it( 'should throw 404 on missing application files', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/apps/test/unknown.js', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 404 );
				expect( body ).to.equal( http.STATUS_CODES[ '404' ] );
				instance.close();
				done();
			} );
		} );
	} );

	it( 'should host local app files', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/apps/test/test.js', function( err, res, body ) {
				expect( body ).to.equal( testFile );
				instance.close();
				done();
			} );
		} );
	} );

	it( 'should proxy to external app - valid file', function( done ) {
		var instance = bender.server.create();

		tempServer.listen( 1032, function() {
			instance.listen( 1031, function() {
				request.get( 'http://localhost:1031/apps/test2/test.js', function( err, res, body ) {
					expect( body ).to.equal( testFile );
					instance.close();
					tempServer.close();
					done();
				} );
			} );
		} );
	} );

	it( 'should proxy to external app - missing file', function( done ) {
		var instance = bender.server.create();

		tempServer.listen( 1032, function() {
			instance.listen( 1031, function() {
				request.get( 'http://localhost:1031/apps/test2/unknown.js', function( err, res, body ) {
					expect( res.statusCode ).to.equal( 404 );
					expect( body ).to.equal( http.STATUS_CODES[ '404' ] );
					instance.close();
					tempServer.close();
					done();
				} );
			} );
		} );
	} );
} );
