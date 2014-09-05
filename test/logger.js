/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Logger module
 */

/*global describe, it */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	winston = require( 'winston' ),
	logger = require( '../lib/logger' );

describe( 'Logger', function() {
	var bender = mocks.getBender(),
		options = {
			console: {
				level: 'silly',
				colorize: false
			}
		};

	bender.use( logger );
	bender.init();

	it( 'should expose an instance of Winston logger', function() {
		expect( bender.logger ).to.be.instanceof( winston.Logger );
	} );

	it( 'should create a logger instance', function() {
		var log = bender.logger.create( 'test' );

		expect( log ).to.be.instanceof( winston.Logger );
	} );

	it( 'should create a logger instance using label', function() {
		var log = bender.logger.create( 'test2', true );

		expect( log ).to.be.instanceof( winston.Logger );
		expect( log.transports.console.label ).to.equal( 'test2' );
	} );

	it( 'should pass configuration to created instance', function() {
		var log = bender.logger.create( 'test3', options );

		expect( log.transports.console.level ).to.equal( 'silly' );
		expect( log.transports.console.colorize ).to.be.false;
	} );

	it( 'should set the log level to "debug" for newly created loggers', function() {
		bender.logger.setDebug( true );

		var log = bender.logger.create( 'testdebug' );

		expect( log.transports.console.level ).to.equal( 'debug' );
	} );

	it( 'should set the log level back to "info" for newly created loggers', function() {
		var log;

		bender.logger.setDebug( true );
		log = bender.logger.create( 'testdebug' );
		expect( log.transports.console.level ).to.equal( 'debug' );

		bender.logger.setDebug( false );
		log = bender.logger.create( 'testinfo' );
		expect( log.transports.console.level ).to.equal( 'info' );
	} );

	it( 'should patch Winston to log error stacks properly', function() {
		var log = bender.logger.create( 'testerror' ),
			error = new Error( 'test error' ),
			oldWrite = process.stderr.write,
			result;

		process.stderr.write = function( data ) {
			result = data;
		};

		log.error( error );

		process.stderr.write = oldWrite;

		expect( result ).to.match( /Error: test error\s+at[\w\.<>\s\(\)\/]+:\d+:\d+\)/ );
	} );

	it( 'should patch Winston to log objects properly', function() {
		var log = bender.logger.create( 'testobj' ),
			oldWrite = process.stderr.write,
			result;

		process.stderr.write = function( data ) {
			result = data;
		};

		log.error( {
			foo: 1
		} );

		expect( result ).to.contain( '{"foo":1}' );

		log.error( [ 1, 2, 3 ] );

		expect( result ).to.contain( '[1,2,3]' );

		var date = new Date();

		log.error( date );

		expect( result ).to.contain( date.toString() );

		log.error( /^foo(\d+)$/gi );

		expect( result ).to.contain( '/^foo(\\d+)$/gi' );

		process.stderr.write = oldWrite;
	} );
} );
