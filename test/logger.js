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
} );
