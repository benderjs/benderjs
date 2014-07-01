/**
 * @file Tests for Default middleware
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
	vm = require( 'vm' ),
	defaultMiddleware = rewire( '../../lib/middleware/default' ),
	utils = require( '../../lib/utils' ),
	serverModule = require( '../../lib/server' );

describe( 'Middleware - Default', function() {
	var bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'sockets' );
		bender.use( [ serverModule, utils ] );
		bender.init();
		bender.middleware = [ defaultMiddleware.create ];
	} );

	it( 'should expose create function', function() {
		expect( defaultMiddleware.create ).to.be.a( 'function' );
	} );

	it( 'should throw 404 on missing files', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/unknown.html', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 404 );
				expect( body ).to.equal( http.STATUS_CODES[ '404' ] );
				instance.close();
				done();
			} );
		} );
	} );

	it( 'should respond to requests for index.html file', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/', function( err, res, body ) {
				var indexFile = fs.readFileSync( path.resolve( 'static/index.html' ) ).toString();

				expect( body ).to.equal( indexFile );

				request.get( 'http://localhost:1031/index.html', function( err, res, body ) {
					expect( body ).to.equal( indexFile );
					instance.close();
					done();
				} );
			} );
		} );
	} );

	it( 'should redirect /capture request to client capture page', function( done ) {
		var instance = bender.server.create(),
			pattern = /^\/clients\/[\w]{8}(-[\w]{4}){3}-[\w]{12}$/;

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/capture', {
				followRedirect: false
			}, function( err, res ) {
				expect( res.statusCode ).to.equal( 302 );
				expect( res.headers.location ).to.match( pattern );

				instance.close();
				done();
			} );
		} );
	} );

	it( 'should respond to /clients/<uuid> requests with capture.html file', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get(
				'http://localhost:1031/clients/b4ab461c-2321-49db-8fc8-5df11c244183',
				function( err, res, body ) {
					var captureFile = fs.readFileSync( path.resolve( 'static/capture.html' ) ).toString();

					expect( body ).to.equal( captureFile );

					instance.close();
					done();
				}
			);
		} );
	} );

	it( 'should respond to /js/bender-config.js with Bender configuration', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get(
				'http://localhost:1031/js/bender-config.js',
				function( err, res, body ) {
					var sandbox = {};

					vm.runInNewContext( body, sandbox );

					expect( sandbox.BENDER_CONFIG ).to.deep.equal( bender.conf );

					instance.close();
					done();
				}
			);
		} );
	} );
} );
