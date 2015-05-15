/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
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
	filesModule = rewire( '../../lib/files' ),
	pluginsModule = rewire( '../../lib/plugins' ),
	utilsModule = rewire( '../../lib/utils' ),
	serverModule = require( '../../lib/server' ),
	Store = require( '../../lib/store' );

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

	beforeEach( function( done ) {
		bender = mocks.getBender( 'conf', 'sockets' );
		bender.conf.plugins = [ 'framework-test' ];
		bender.use( [ utilsModule, filesModule, pluginsModule, serverModule ] );
		bender.plugins.load();
		bender.middlewares = new Store();
		bender.middlewares.add( 'plugins', plugins.build );
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
		var file = require( path.resolve( 'framework-test/' ) ).files[ 0 ],
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
