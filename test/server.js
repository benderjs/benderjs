/**
 * @file Tests for Server module
 */

/*global describe, it, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './mocks' ),
	expect = require( 'chai' ).expect,
	http = require( 'http' ),
	rewire = require( 'rewire' ),
	server = rewire( '../lib/server' );

describe( 'Server', function() {
	var bender;

	beforeEach( function() {
		bender = mocks.getBender( 'sockets', 'middleware', 'utils' );
		bender.use( server );
	} );

	it( 'should expose "create" function when attached to Bender', function() {
		expect( bender.server.create ).to.be.a( 'function' );
	} );

	it( 'should return an instance of HTTP Server when created', function() {
		var instance = bender.server.create();

		expect( instance ).to.be.instanceof( http.Server );
	} );

	it( 'should serve static files by default', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, 'localhost', function() {
			http.get( 'http://localhost:1031/', function( res ) {
				expect( res.statusCode ).to.equal( 200 );
				instance.close();
				done();
			} );
		} );
	} );

	it( 'should attach middleware defined in Bender config', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, 'localhost', function() {
			http.get( 'http://localhost:1031/test', function( res ) {
				var data = '';

				expect( res.statusCode ).to.equal( 200 );

				res.on( 'data', function( chunk ) {
					data += chunk;
				} );

				res.on( 'end', function() {
					expect( data ).to.equal( 'Test response' );
					instance.close();
					done();
				} );
			} );
		} );
	} );

	it( 'should respond with 404 if none of middlewares handled the request', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, 'localhost', function() {
			http.get( 'http://localhost:1031/invalid/request', function( res ) {
				var data = '';

				expect( res.statusCode ).to.equal( 404 );

				res.on( 'data', function( chunk ) {
					data += chunk;
				} );

				res.on( 'end', function() {
					expect( data ).to.equal( http.STATUS_CODES[ '404' ] );
					instance.close();
					done();
				} );
			} );
		} );
	} );
} );
