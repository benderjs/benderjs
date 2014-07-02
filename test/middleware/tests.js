/**
 * @file Tests for Tests middleware
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
	_ = require( 'lodash' ),
	tests = rewire( '../../lib/middleware/tests' ),
	serverModule = require( '../../lib/server' ),
	utilsModule = require( '../../lib/utils' );

describe( 'Middleware - Tests', function() {
	var testHtml = fs.readFileSync( path.resolve( 'test/fixtures/tests/test/1.html' ) ).toString(),
		bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'sockets', 'tests', 'template' );
		bender.use( [ serverModule, utilsModule ] );
		bender.init();
		bender.middleware = [ tests.create ];
	} );

	it( 'should expose create function', function() {
		expect( tests.create ).to.be.a( 'function' );
	} );

	it( 'should throw 404 on missing files', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/tests/test/unknown.html', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 404 );
				expect( body ).to.equal( http.STATUS_CODES[ '404' ] );
				instance.close();
				done();
			} );
		} );
	} );

	it( 'should redirect to filtered tests list if test directory specified in the URL', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get(
				'http://localhost:1031/test/fixtures/tests/test/filter/foo/', {
					followRedirect: false
				},
				function( err, res ) {
					expect( res.statusCode ).to.equal( 302 );
					expect( res.headers.location ).to.equal( '/#tests/foo' );
					instance.close();
					done();
				} );
		} );
	} );

	it( 'should serve test assets', function( done ) {
		var instance = bender.server.create(),
			file = 'test/fixtures/tests/test/_assets/asset.js';

		instance.listen( 1031, function() {
			request.get(
				'http://localhost:1031/' + file, {
					followRedirect: false
				},
				function( err, res, body ) {
					var assetFile = fs.readFileSync( path.resolve( file ) ).toString();

					expect( res.statusCode ).to.equal( 200 );
					expect( body ).to.equal( assetFile );

					instance.close();
					done();
				} );
		} );
	} );

	it( 'should respond to /tests request with a list of tests', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/tests', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );

				bender.tests.list()
					.done( function( list ) {
						expect( JSON.parse( body ) ).to.deep.equal( {
							test: list.map( function( test ) {
								return _.pick( test, [ 'id', 'group', 'tags' ] );
							} )
						} );

						instance.close();
						done();
					} );
			} );
		} );
	} );

	it( 'should serve test page if test ID was given', function( done ) {
		var instance = bender.server.create(),
			file = 'test/fixtures/tests/test/1';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/' + file, function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( testHtml );

				instance.close();
				done();
			} );
		} );
	} );

	it( 'should serve test page if test JS file was given', function( done ) {
		var instance = bender.server.create(),
			file = 'test/fixtures/tests/test/1.js';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/' + file, function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( testHtml );

				instance.close();
				done();
			} );
		} );
	} );

	it( 'should serve test page if test HTML file was given', function( done ) {
		var instance = bender.server.create(),
			file = 'test/fixtures/tests/test/1.html';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/' + file, function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( testHtml );

				instance.close();
				done();
			} );
		} );
	} );

	it( 'should serve test page if test ID with search string was given', function( done ) {
		var instance = bender.server.create(),
			file = 'test/fixtures/tests/test/1?foo=bar&';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/' + file, function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( testHtml );

				instance.close();
				done();
			} );
		} );
	} );
} );
