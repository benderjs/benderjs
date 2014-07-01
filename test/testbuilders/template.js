/**
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

describe( 'Test Builders - Default', function() {
	var sampleData = {
			files: [
				'test/fixtures/tests/test2/template.html',
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
				'test/fixtures/tests/test2/template.html',
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

	it( 'should add template.html as test\'s html if available', function() {
		var expected = {
				'test/fixtures/tests/test/1': {
					id: 'test/fixtures/tests/test/1',
					js: 'test/fixtures/tests/test/1.js',
					html: 'test/fixtures/tests/test/1.html'
				},
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/template.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					html: 'test/fixtures/tests/test2/template.html'
				},
				'test/fixtures/tests/test2/3': {
					id: 'test/fixtures/tests/test2/3',
					js: 'test/fixtures/tests/test2/3.js',
					html: 'test/fixtures/tests/test2/template.html'
				}
			},
			result = template.build( sampleData );

		expect( result.tests ).to.deep.equal( expected );
	} );

	it( 'should not override existing test\'s html with template.html', function() {
		var expected = {
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/1.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					html: 'test/fixtures/tests/test2/template.html'
				},
				'test/fixtures/tests/test2/3': {
					id: 'test/fixtures/tests/test2/3',
					js: 'test/fixtures/tests/test2/3.js',
					html: 'test/fixtures/tests/test2/template.html'
				}
			},
			result = template.build( sampleData2 );

		expect( result.tests ).to.deep.equal( expected );
	} );
} );
