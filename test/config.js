/**
 * @file Tests for Config module
 */

/*global describe, it */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './mocks' ),
	sinon = require( 'sinon' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	path = require( 'path' ),
	config = rewire( '../lib/config' ),
	testDir = path.resolve( 'test/fixtures/' );

config.__set__( 'process.cwd', function() {
	return testDir;
} );

config.__set__( 'log.error', function( args ) {
	return Array.prototype.join.apply( args, ' ' );
} );

var error = config.__get__( 'log.error' );

describe( 'Config', function() {
	var bender = mocks.getBender();

	it( 'should load valid configuration file', function() {
		bender.use( config, {
			path: path.resolve( 'config-valid.js' )
		} );

		expect( bender.conf ).to.exist;
	} );

	it( 'should report missing configuration file', function() {
		var exit = sinon.stub( process, 'exit' );

		exit.throws();

		expect( function() {
			bender.use( config, {
				path: path.resolve( 'config-missing.js' )
			} );
		} ).to.throw();

		process.exit.restore();
	} );

	it( 'should report invalid configuration file', function() {
		var exit = sinon.stub( process, 'exit' );

		exit.throws();

		expect( function() {
			bender.use( config, {
				path: path.resolve( 'config-invalid.js' )
			} );
		} ).to.throw();

		process.exit.restore();
	} );

	it( 'should report non-module configuration file', function() {
		var exit = sinon.stub( process, 'exit' );

		exit.throws();

		expect( function() {
			bender.use( config, {
				path: path.normalize( 'test/fixtures/config-non-module.js' )
			} );
		} ).to.throw();

		process.exit.restore();
	} );
} );
