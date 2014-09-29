/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Template test builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	template = rewire( '../../lib/testbuilders/template' );

describe( 'Test Builders - Template', function() {
	var sampleData = {
			files: [
				'test/fixtures/tests/test2/__template__.html',
			],
			tests: {
				'test/fixtures/tests/test/1': {
					id: 'test/fixtures/tests/test/1',
					js: 'test/fixtures/tests/test/1.js',
					html: 'test/fixtures/tests/test/1.html'
				},
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js'
				},
				'test/fixtures/tests/test2/3': {
					id: 'test/fixtures/tests/test2/3',
					js: 'test/fixtures/tests/test2/3.js'
				}
			}
		},
		sampleData2 = {
			files: [
				'test/fixtures/tests/test2/__template__.html',
			],
			tests: {
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/1.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js'
				},
				'test/fixtures/tests/test2/3': {
					id: 'test/fixtures/tests/test2/3',
					js: 'test/fixtures/tests/test2/3.js'
				}
			}
		},
		sampleData3 = {
			files: [
				'test/fixtures/tests/test2/__template__.js',
			],
			tests: {
				'test/fixtures/tests/1': {
					id: 'test/fixtures/tests/1',
					js: 'test/fixtures/tests/1.js',
					html: 'test/fixtures/tests/1.html'
				},
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/1.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					include: [ '%BASE_PATH%foo.js' ]
				}
			}
		},
		oldAttach,
		bender;

	before( function() {
		oldAttach = template.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'utils', 'conf' );
		template.attach = oldAttach || mocks.attachPagebuilder( bender, template );
		bender.use( template );
	} );

	after( function() {
		template.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( template.build ).to.be.a( 'function' );
	} );

	it( 'should add __template__.html as test\'s html if available', function() {
		var expected = {
				'test/fixtures/tests/test/1': {
					id: 'test/fixtures/tests/test/1',
					js: 'test/fixtures/tests/test/1.js',
					html: 'test/fixtures/tests/test/1.html'
				},
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/__template__.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					html: 'test/fixtures/tests/test2/__template__.html'
				},
				'test/fixtures/tests/test2/3': {
					id: 'test/fixtures/tests/test2/3',
					js: 'test/fixtures/tests/test2/3.js',
					html: 'test/fixtures/tests/test2/__template__.html'
				}
			},
			result = template.build( sampleData );

		expect( result.tests ).to.deep.equal( expected );
	} );

	it( 'should not override existing test\'s html with __template__.html', function() {
		var expected = {
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/1.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					html: 'test/fixtures/tests/test2/__template__.html'
				},
				'test/fixtures/tests/test2/3': {
					id: 'test/fixtures/tests/test2/3',
					js: 'test/fixtures/tests/test2/3.js',
					html: 'test/fixtures/tests/test2/__template__.html'
				}
			},
			result = template.build( sampleData2 );

		expect( result.tests ).to.deep.equal( expected );
	} );

	it( 'should include __template__.js file if found in the same directory level', function() {
		var expected = {
				'test/fixtures/tests/1': {
					id: 'test/fixtures/tests/1',
					js: 'test/fixtures/tests/1.js',
					html: 'test/fixtures/tests/1.html'
				},
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/1.html',
					include: [ '%TEST_DIR%__template__.js' ]
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					include: [ '%BASE_PATH%foo.js', '%TEST_DIR%__template__.js' ]
				}
			},
			result = template.build( sampleData3 );

		expect( result.tests ).to.deep.equal( expected );
	} );
} );
