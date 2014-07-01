/**
 * @file Tests for Plugins middleware
 */

/*global describe, it, beforeEach, before, after */
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
	plugins = rewire( '../../lib/middleware/plugins' ),
	pluginsModule = rewire( '../../lib/plugins' ),
	serverModule = require( '../../lib/server' );

describe( 'Middleware - Plugins', function() {
	var oldCwd,
		oldLog,
		bender;

	before( function() {
		var cwd = path.resolve( 'test/fixtures/plugins/' );

		oldCwd = process.cwd;
		oldLog = pluginsModule.__get__( 'log' );
		oldLog = pluginsModule.__set__( 'log', mocks.logger );

		process.cwd = function() {
			return cwd;
		};
	} );

	after( function() {
		process.cwd = oldCwd;
		oldLog = pluginsModule.__set__( 'log', oldLog );
	} );

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'sockets' );
		bender.conf.plugins = [ 'assertion-test' ];
		bender.use( [ serverModule, pluginsModule ] );
		bender.init();
		bender.middleware = [ plugins.create ];
	} );

	it( 'should expose create function', function() {
		expect( plugins.create ).to.be.a( 'function' );
	} );

	it( 'should throw 404 on missing files', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/plugins/unknown.html', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 404 );
				expect( body ).to.equal( http.STATUS_CODES[ '404' ] );
				instance.close();
				done();
			} );
		} );
	} );

	it( 'should respond with valid plugin\'s file', function( done ) {
		var instance = bender.server.create(),
			file = path.resolve( 'assertion-test/adapter.js' ),
			url = 'http://localhost:1031/plugins/' + file.split( path.sep ).join( '/' );

		instance.listen( 1031, function() {
			request.get( url, function( err, res, body ) {
				var pluginFile = fs.readFileSync( file ).toString();

				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( pluginFile );

				instance.close();
				done();
			} );
		} );
	} );
} );
