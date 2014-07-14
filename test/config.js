/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Config module
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	sinon = require( 'sinon' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	path = require( 'path' ),
	config = rewire( '../lib/config' ),
	testDir = path.resolve( 'test/fixtures/' );

describe( 'Config', function() {
	var oldCwd;

	before( function() {
		oldCwd = config.__get__( 'process.cwd' );
		config.__set__( 'process.cwd', function() {
			return testDir;
		} );
		config.__set__( 'logger', mocks.logger );
	} );

	after( function() {
		config.__set__( 'process.cwd', oldCwd );
	} );

	it( 'should load valid configuration file', function() {
		var bender = mocks.getBender();

		bender.use( config, {
			path: path.resolve( 'config-valid.js' )
		} );

		expect( bender.conf ).to.exist;
	} );

	it( 'should report missing configuration file', function() {
		var exit = sinon.stub( process, 'exit' ),
			bender = mocks.getBender();

		exit.throws();

		expect( function() {
			bender.use( config, {
				path: path.resolve( 'config-missing.js' )
			} );
		} ).to.throw();

		process.exit.restore();
	} );

	it( 'should not report missing global configuration file', function() {
		var exit = sinon.stub( process, 'exit' ),
			bender = mocks.getBender();

		config.__set__( 'process.env.HOME', path.resolve( 'test/fixtures/home/' ) );

		exit.throws();

		expect( function() {
			bender.use( config, {
				path: path.resolve( 'config-valid.js' )
			} );
		} ).to.not.throw();

		process.exit.restore();
	} );

	it( 'should report invalid configuration file', function() {
		var exit = sinon.stub( process, 'exit' ),
			bender = mocks.getBender();

		config.__set__( 'process.env.HOME', '' );

		exit.throws();

		expect( function() {
			bender.use( config, {
				path: path.resolve( 'config-invalid.js' )
			} );
		} ).to.throw();

		process.exit.restore();
	} );

	it( 'should report non-module configuration file', function() {
		var exit = sinon.stub( process, 'exit' ),
			bender = mocks.getBender();

		exit.throws();

		expect( function() {
			bender.use( config, {
				path: path.normalize( 'test/fixtures/config-non-module.js' )
			} );
		} ).to.throw();

		process.exit.restore();
	} );

	it( 'should merge configuration files', function() {
		var bender = mocks.getBender();

		bender.use( config, {
			path: path.resolve( 'config-valid.js' )
		} );

		expect( bender.conf.plugins ).to.exist;
		expect( bender.conf.plugins ).to.have.length( 2 );
		expect( bender.conf.framework ).to.equal( 'qunit' );
		expect( bender.conf.testTimeout ).to.equal( 60000 );
	} );
} );
