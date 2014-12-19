/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for CLI module
 */

/*global describe, it, before, beforeEach, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var sinon = require( 'sinon' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	pkg = require( '../package.json' ),
	cli = rewire( '../lib/cli' ),
	oldWrite,
	writeBuffer;

var main = cli.__get__( 'main' );

describe( 'CLI', function() {
	before( function() {
		oldWrite = process.stdout.write;
		process.stdout.write = write;
		cli.__set__( 'main', main );
	} );

	after( function() {
		process.stdout.write = oldWrite;
	} );

	beforeEach( function() {
		writeBuffer = '';
	} );

	function setArgs( argv ) {
		process.argv = [ 'node', 'cli.js' ].concat( argv );
	}

	function write() {
		oldWrite.apply( process.stdout, arguments );
		writeBuffer = Array.prototype.join.call( arguments, '' ).replace( /\n/g, '' );
	}

	it( 'should display current Bender version', function() {
		setArgs( [ 'version' ] );
		cli.run();
		expect( writeBuffer ).to.equal( 'Bender.js v' + pkg.version );
	} );

	it( 'should call main.clean', function() {
		var stub = sinon.stub( main, 'clean' );

		setArgs( [ 'clean' ] );
		cli.run();

		expect( stub.called ).to.be.true;

		stub.restore();
	} );

	it( 'should call main.initialize', function() {
		var stub = sinon.stub( main, 'initialize' );

		setArgs( [ 'init' ] );
		cli.run();

		expect( stub.called ).to.be.true;

		stub.restore();
	} );

	it( 'should call main.runTests', function() {
		var stub = sinon.stub( main, 'runTests' );

		setArgs( [ 'run' ] );
		cli.run();

		expect( stub.called ).to.be.true;

		stub.restore();
	} );

	it( 'should call main.serverList', function() {
		var stub = sinon.stub( main, 'serverList' );

		setArgs( [ 'server', 'list' ] );
		cli.run();

		expect( stub.called ).to.be.true;

		stub.restore();
	} );

	it( 'should call main.serverStart', function() {
		var stub = sinon.stub( main, 'serverStart' );

		setArgs( [ 'server', 'start' ] );
		cli.run();

		expect( stub.called ).to.be.true;

		stub.restore();
	} );

	it( 'should call main.serverRestart', function() {
		var stub = sinon.stub( main, 'serverRestart' );

		setArgs( [ 'server', 'restart' ] );
		cli.run();

		expect( stub.called ).to.be.true;

		stub.restore();
	} );

	it( 'should call main.serverRun', function() {
		var stub = sinon.stub( main, 'serverRun' );

		setArgs( [ 'server', 'run' ] );
		cli.run();

		expect( stub.called ).to.be.true;

		stub.restore();
	} );

	it( 'should call main.serverStop', function() {
		var stub = sinon.stub( main, 'serverStop' );

		setArgs( [ 'server', 'stop' ] );
		cli.run();

		expect( stub.called ).to.be.true;

		stub.restore();
	} );

	it( 'should call main.serverStatus', function() {
		var stub = sinon.stub( main, 'serverStatus' );

		setArgs( [ 'server', 'status' ] );
		cli.run();

		expect( stub.called ).to.be.true;

		stub.restore();
	} );

	it( 'should automatically pass the default config', function() {
		var stub = sinon.stub( main, 'serverRun' );

		setArgs( [ 'server', 'run' ] );
		cli.run();

		expect( stub.called ).to.be.true;
		expect( stub.calledWith( {
			config: 'bender.js'
		} ) ).to.be.true;

		stub.restore();
	} );

	it( 'should pass configuration options', function() {
		var stub = sinon.stub( main, 'serverRun' );

		setArgs( [ 'server', 'run', '--port', '12345', '--hostname', 'foo', '--config', 'test.js', '--debug' ] );
		cli.run();

		expect( stub.called ).to.be.true;
		expect( stub.calledWith( {
			config: 'test.js',
			debug: true,
			hostname: 'foo',
			port: '12345'
		} ) ).to.be.true;

		stub.restore();
	} );
} );
