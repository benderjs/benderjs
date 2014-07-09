/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Plugins module
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
	plugins = rewire( '../lib/plugins' );

describe( 'Plugins', function() {
	var oldLog, oldCwd;

	before( function() {
		var cwd = path.resolve( 'test/fixtures/plugins/' );

		oldLog = plugins.__get__( 'logger' );
		oldCwd = plugins.__get__( 'process.cwd' );

		plugins.__set__( 'logger', mocks.logger );
		plugins.__set__( 'process.cwd', function() {
			return cwd;
		} );
	} );

	after( function() {
		plugins.__set__( 'logger', oldLog );
		plugins.__set__( 'process.cwd', oldCwd );
	} );

	it( 'should prepare namespaces for plugins when attached to Bender', function() {
		var bender = mocks.getBender();

		bender.conf = {
			plugins: []
		};

		bender.use( plugins );

		expect( bender ).to.include.keys( [ 'assertions', 'pagebuilders', 'testbuilders', 'reporters' ] );
	} );

	it( 'should not throw if no plugins defined', function() {
		var bender = mocks.getBender();

		bender.conf = {};
		expect( function() {
			bender.use( plugins );
		} ).to.not.throw();
	} );

	it( 'should exit Bender if missing plugin defined', function() {
		var bender = mocks.getBender(),
			exit = sinon.stub( process, 'exit' );

		exit.throws();

		bender.conf = {
			plugins: [ 'missing-plugin' ]
		};

		expect( function() {
			bender.use( plugins );
		} ).to.throw();

		process.exit.restore();
	} );

	it( 'should exit Bender if invalid plugin defined', function() {
		var bender = mocks.getBender(),
			exit = sinon.stub( process, 'exit' );

		exit.throws();

		bender.conf = {
			plugins: [ 'invalid-plugin' ]
		};

		expect( function() {
			bender.use( plugins );
		} ).to.throw();

		process.exit.restore();
	} );

	it( 'should load assertion plugin', function() {
		var bender = mocks.getBender();

		bender.conf = {
			plugins: [ 'assertion-test' ]
		};

		bender.use( plugins );

		expect( bender.assertions ).to.include.key( 'test' );
	} );

	it( 'should load pagebuilder plugin', function() {
		var bender = mocks.getBender();

		bender.conf = {
			plugins: [ 'pagebuilder-test' ]
		};

		bender.use( plugins );

		expect( bender.pagebuilders ).to.have.length( 1 );
		expect( bender.pagebuilders[ 0 ] ).to.be.a( 'function' );
	} );

	it( 'should load testbuilder plugin', function() {
		var bender = mocks.getBender();

		bender.conf = {
			plugins: [ 'testbuilder-test' ]
		};

		bender.use( plugins );

		expect( bender.testbuilders ).to.have.length( 1 );
		expect( bender.testbuilders[ 0 ] ).to.be.a( 'function' );
	} );

	it( 'should load reporter plugin', function() {
		var bender = mocks.getBender();

		bender.conf = {
			plugins: [ 'reporter-test' ]
		};

		bender.use( plugins );

		expect( bender.reporters ).to.include.key( 'test' );
	} );

	it( 'should load advanced plugin containing its own attach function', function() {
		var bender = mocks.getBender();

		bender.conf = {
			plugins: [ 'advanced-test' ]
		};

		bender.use( plugins );

		expect( bender.pagebuilders ).to.have.length( 1 );
		expect( bender.pagebuilders[ 0 ] ).to.be.a( 'function' );
		expect( bender.testbuilders ).to.have.length( 1 );
		expect( bender.testbuilders[ 0 ] ).to.be.a( 'function' );
	} );

	it( 'should check if a file was defined in plugins', function() {
		var bender = mocks.getBender(),
			validFile = path.resolve( 'assertion-test/adapter.js' ),
			invalidFile = path.resolve( 'assertion-test/invalid-file.js' );

		bender.conf = {
			plugins: [ 'assertion-test' ]
		};

		bender.use( plugins );

		expect( bender.plugins.checkFile( validFile ) ).to.be.true;
		expect( bender.plugins.checkFile( invalidFile ) ).to.be.false;
	} );

	it( 'should load plugin from the given location', function() {
		var bender = mocks.getBender(),
			dir = path.resolve( 'assertion-test' );

		bender.conf = {
			plugins: [ dir ]
		};

		bender.use( plugins );

		expect( bender.assertions ).to.include.key( 'test' );
	} );
} );
