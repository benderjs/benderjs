/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Default middleware
 */

/*global describe, it, beforeEach, afterEach */
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
	defaultMiddleware = rewire( '../../lib/middlewares/default' ),
	utils = require( '../../lib/utils' ),
	serverModule = require( '../../lib/server' );

describe( 'Middleware - Default', function() {
	var bender,
		instance;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'sockets' );
		bender.use( [ serverModule, utils ] );
		bender.init();
		bender.middlewares = [ defaultMiddleware.build ];
		instance = bender.server.create();
	} );

	afterEach( function() {
		try {
			instance.close();
		} catch ( e ) {}
	} );

	it( 'should expose build function', function() {
		expect( defaultMiddleware.build ).to.be.a( 'function' );
	} );

	it( 'should throw 404 on missing files', function( done ) {
		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/unknown.html', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 404 );
				expect( body ).to.equal( http.STATUS_CODES[ '404' ] );

				done();
			} );
		} );
	} );

	it( 'should respond to requests for index.html file', function( done ) {
		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/', function( err, res, body ) {
				var indexFile = fs.readFileSync( path.resolve( 'static/index.html' ) ).toString();

				expect( body ).to.equal( indexFile );

				request.get( 'http://localhost:1031/index.html', function( err, res, body ) {
					expect( res.statusCode ).to.equal( 200 );
					expect( body ).to.equal( indexFile );

					done();
				} );
			} );
		} );
	} );

	it( 'should redirect /capture request to client capture page', function( done ) {
		var pattern = /^\/clients\/[\w]{8}(-[\w]{4}){3}-[\w]{12}$/;

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/capture', {
				followRedirect: false
			}, function( err, res ) {
				expect( res.statusCode ).to.equal( 302 );
				expect( res.headers.location ).to.match( pattern );

				done();
			} );
		} );
	} );

	it( 'should respond to /clients/<uuid> requests with capture.html file', function( done ) {
		instance.listen( 1031, function() {
			request.get(
				'http://localhost:1031/clients/b4ab461c-2321-49db-8fc8-5df11c244183',
				function( err, res, body ) {
					var captureFile = fs.readFileSync( path.resolve( 'static/capture.html' ) ).toString();

					expect( res.statusCode ).to.equal( 200 );
					expect( body ).to.equal( captureFile );

					done();
				}
			);
		} );
	} );

	it( 'should respond to /js/bender-config.js with Bender configuration', function( done ) {
		instance.listen( 1031, function() {
			request.get(
				'http://localhost:1031/js/bender-config.js',
				function( err, res, body ) {
					var sandbox = {};

					expect( res.statusCode ).to.equal( 200 );

					vm.runInNewContext( body, sandbox );

					expect( sandbox.BENDER_CONFIG ).to.deep.equal( bender.conf );

					done();
				}
			);
		} );
	} );
} );
