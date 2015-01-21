/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Default test builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	manualBuilder = rewire( '../../lib/testbuilders/manual' );

describe( 'Test Builders - Manual', function() {
	var sampleData = {
			files: [
				'test/fixtures/tests/test/1.js',
				'test/fixtures/tests/test/2.js',
				'test/fixtures/tests/test/2.md',
				'test/fixtures/tests/test/3.md',
				'test/fixtures/tests/test/3.html',
				'test/fixtures/tests/test/3.js',
				'test/fixtures/tests/test/4.md'
			],
			tests: {}
		},
		oldAttach,
		bender;

	before( function() {
		oldAttach = manualBuilder.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'testbuilders', 'utils' );
		manualBuilder.attach = oldAttach || mocks.attachPagebuilder( bender, 'manual', manualBuilder );
		bender.use( manualBuilder );
	} );

	after( function() {
		manualBuilder.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( manualBuilder.build ).to.be.a( 'function' );
	} );

	it( 'should build manual tests if .md file was found', function() {
		var expected = {
				files: [
					'test/fixtures/tests/test/1.js',
					'test/fixtures/tests/test/2.js',
					'test/fixtures/tests/test/3.js'
				],
				tests: {
					'test/fixtures/tests/test/2': {
						id: 'test/fixtures/tests/test/2',
						manual: true,
						script: 'test/fixtures/tests/test/2.md',
						unit: false
					},
					'test/fixtures/tests/test/3': {
						html: 'test/fixtures/tests/test/3.html',
						id: 'test/fixtures/tests/test/3',
						manual: true,
						script: 'test/fixtures/tests/test/3.md',
						unit: false
					},
					'test/fixtures/tests/test/4': {
						id: 'test/fixtures/tests/test/4',
						manual: true,
						script: 'test/fixtures/tests/test/4.md',
						unit: false
					},
				}
			},
			result = manualBuilder.build( sampleData );

		expect( result ).to.deep.equal( expected );
	} );
} );
