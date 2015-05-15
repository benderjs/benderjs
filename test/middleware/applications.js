/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Applications middleware
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
	applications = rewire( '../../lib/middlewares/applications' ),
	appsModule = require( '../../lib/applications' ),
	filesModule = require( '../../lib/files' ),
	utilsModule = require( '../../lib/utils' ),
	serverModule = require( '../../lib/server' ),
	Store = require( '../../lib/store' );

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
		instance,
		bender;

	beforeEach( function( done ) {
		bender = mocks.getBender( 'conf', 'sockets' );
		bender.preprocessors = [];
		bender.middlewares = new Store();
		bender.middlewares.add( 'applications', applications.build );
		bender.use( [ utilsModule, filesModule, serverModule, appsModule ] );
		bender.init();
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

	this.timeout( 5000 );

	it( 'should expose build function', function() {
		expect( applications.build ).to.be.a( 'function' );
	} );

	it( 'should throw 404 on missing application files', function( done ) {
		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/apps/test/unknown.js', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 404 );
				expect( body ).to.equal( http.STATUS_CODES[ '404' ] );

				done();
			} );
		} );
	} );

	it( 'should host local app files', function( done ) {
		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/apps/test/test.js', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( testFile );

				done();
			} );
		} );
	} );

	it( 'should proxy to external app - valid file', function( done ) {
		tempServer.listen( 1032, function() {
			instance.listen( 1031, function() {
				request.get( 'http://localhost:1031/apps/test2/test.js', function( err, res, body ) {
					expect( res.statusCode ).to.equal( 200 );
					expect( body ).to.equal( testFile );

					tempServer.close();

					done();
				} );
			} );
		} );
	} );

	it( 'should proxy to external app - missing file', function( done ) {
		tempServer.listen( 1032, function() {
			instance.listen( 1031, function() {
				request.get( 'http://localhost:1031/apps/test2/unknown.js', function( err, res, body ) {
					expect( res.statusCode ).to.equal( 404 );
					expect( body ).to.equal( http.STATUS_CODES[ '404' ] );

					tempServer.close();

					done();
				} );
			} );
		} );
	} );
} );
