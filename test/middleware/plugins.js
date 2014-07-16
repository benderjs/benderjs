/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Plugins middleware
 */

/*global describe, it, beforeEach, afterEach, before, after */
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
	plugins = rewire( '../../lib/middlewares/plugins' ),
	pluginsModule = rewire( '../../lib/plugins' ),
	serverModule = require( '../../lib/server' );

describe( 'Middleware - Plugins', function() {
	var oldCwd,
		oldLog,
		instance,
		bender;

	before( function() {
		var cwd = path.resolve( 'test/fixtures/plugins/' );

		oldCwd = process.cwd;
		oldLog = pluginsModule.__get__( 'logger' );
		oldLog = pluginsModule.__set__( 'logger', mocks.logger );

		process.cwd = function() {
			return cwd;
		};
	} );

	after( function() {
		process.cwd = oldCwd;
		oldLog = pluginsModule.__set__( 'logger', oldLog );
	} );

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'sockets' );
		bender.conf.plugins = [ 'framework-test' ];
		bender.use( [ serverModule, pluginsModule ] );
		bender.plugins.load();
		bender.init();
		bender.middlewares = [ plugins.build ];
		instance = bender.server.create();
	} );

	afterEach( function() {
		try {
			instance.close();
		} catch ( e ) {}
	} );

	it( 'should expose build function', function() {
		expect( plugins.build ).to.be.a( 'function' );
	} );

	it( 'should throw 404 on missing files', function( done ) {
		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/plugins/unknown.html', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 404 );
				expect( body ).to.equal( http.STATUS_CODES[ '404' ] );

				done();
			} );
		} );
	} );

	it( 'should respond with valid plugin\'s file', function( done ) {
		var file = path.resolve( 'framework-test/adapter.js' ),
			url = 'http://localhost:1031/plugins/' + file.split( path.sep ).join( '/' );

		instance.listen( 1031, function() {
			request.get( url, function( err, res, body ) {
				var pluginFile = fs.readFileSync( file ).toString();

				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( pluginFile );

				done();
			} );
		} );
	} );
} );
