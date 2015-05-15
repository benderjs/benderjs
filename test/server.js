/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Server module
 */

/*global describe, it, beforeEach, afterEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	http = require( 'http' ),
	rewire = require( 'rewire' ),
	server = rewire( '../lib/server' );

describe( 'Server', function() {
	var bender,
		instance;

	beforeEach( function( done ) {
		bender = mocks.getBender( 'sockets', 'middlewares', 'utils', 'conf' );
		bender.use( server );

		bender.server.create().done( function( server ) {
			instance = server;
			done();
		}, function( err ) {
			throw err;
		} );
	} );

	afterEach( function() {
		try {
			instance.close();
		} catch ( e ) {}
	} );

	it( 'should expose "create" function when attached to Bender', function() {
		expect( bender.server.create ).to.be.a( 'function' );
	} );

	it( 'should return an instance of HTTP Server when created', function() {
		expect( instance ).to.be.instanceof( http.Server );
	} );

	it( 'should serve static files by default', function( done ) {
		instance.listen( 1031, 'localhost', function() {
			http.get( 'http://localhost:1031/', function( res ) {
				expect( res.statusCode ).to.equal( 200 );

				done();
			} );
		} );
	} );

	it( 'should attach middleware defined in Bender config', function( done ) {
		instance.listen( 1031, 'localhost', function() {
			http.get( 'http://localhost:1031/test', function( res ) {
				var data = '';

				expect( res.statusCode ).to.equal( 200 );

				res.on( 'data', function( chunk ) {
					data += chunk;
				} );

				res.on( 'end', function() {
					expect( data ).to.equal( 'Test response' );

					done();
				} );
			} );
		} );
	} );

	it( 'should respond with 404 if none of middlewares handled the request', function( done ) {
		instance.listen( 1031, 'localhost', function() {
			http.get( 'http://localhost:1031/invalid/request', function( res ) {
				var data = '';

				expect( res.statusCode ).to.equal( 404 );

				res.on( 'data', function( chunk ) {
					data += chunk;
				} );

				res.on( 'end', function() {
					expect( data ).to.equal( http.STATUS_CODES[ '404' ] );

					done();
				} );
			} );
		} );
	} );
} );
