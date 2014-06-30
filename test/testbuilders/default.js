/**
 * @file Tests for Default test builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	defaultBuilder = rewire( '../../lib/testbuilders/default' );

describe( 'Page Builders - Default', function() {
	var sampleData = {
			files: [
				'test/fixtures/tests/test/1.html',
				'test/fixtures/tests/test/2.js',
				'test/fixtures/tests/test/2.htm',
				'test/fixtures/tests/test/3.js',
				'test/fixtures/tests/test/1.js',
				'test/fixtures/tests/test2/2.js',
				'test/fixtures/tests/test2/3.js',
				'test/fixtures/tests/test2/1.js'
			],
			tests: {}
		},
		sampleData2 = {
			files: [
				'test/fixtures/tests/test2/1.js',
				'test/fixtures/tests/test2/2.js',
				'test/fixtures/tests/test2/3.js',
				'test/fixtures/tests/test2/template.js',
				'test/fixtures/tests/test2/template.html',
			],
			tests: {}
		},
		sampleData3 = {
			files: [
				'test/fixtures/tests/test/1.html',
				'test/fixtures/tests/test/2.html'
			],
			tests: {}
		},
		oldAttach,
		bender;

	before( function() {
		oldAttach = defaultBuilder.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'testbuilders', 'utils' );
		defaultBuilder.attach = oldAttach || mocks.attachPagebuilder( bender, defaultBuilder );
		bender.use( defaultBuilder );
	} );

	after( function() {
		defaultBuilder.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( defaultBuilder.build ).to.be.a( 'function' );
	} );

	it( 'should be attached as a first page builder', function() {
		expect( bender.testbuilders[ 0 ] ).to.equal( defaultBuilder.build );
	} );

	it( 'should prepare tests from the given file list', function() {
		var expected = {
				'test/fixtures/tests/test/1': {
					id: 'test/fixtures/tests/test/1',
					js: 'test/fixtures/tests/test/1.js',
					html: 'test/fixtures/tests/test/1.html'
				},
				'test/fixtures/tests/test/2': {
					id: 'test/fixtures/tests/test/2',
					js: 'test/fixtures/tests/test/2.js',
					html: 'test/fixtures/tests/test/2.htm'
				},
				'test/fixtures/tests/test/3': {
					id: 'test/fixtures/tests/test/3',
					js: 'test/fixtures/tests/test/3.js'
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
			},
			result = defaultBuilder.build( sampleData );

		expect( result.tests ).to.deep.equal( expected );
	} );

	it( 'should strip parsed tests from data\'s file list', function() {
		var result = defaultBuilder.build( sampleData );

		expect( result.files ).to.be.empty;
	} );

	it( 'should not strip template.html files from data\'s file list', function() {
		var expected = {
				files: [ 'test/fixtures/tests/test2/template.html' ],
				tests: {
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
					},
					'test/fixtures/tests/test2/template': {
						id: 'test/fixtures/tests/test2/template',
						js: 'test/fixtures/tests/test2/template.js',
						html: 'test/fixtures/tests/test2/template.html'
					}
				}
			},
			result = defaultBuilder.build( sampleData2 );

		expect( result ).to.deep.equal( expected );
		expect( result.files ).to.contain( 'test/fixtures/tests/test2/template.html' );
	} );

	it( 'should not build tests if no .js file specified', function() {
		var expected = {
				files: [
					'test/fixtures/tests/test/1.html',
					'test/fixtures/tests/test/2.html'
				],
				tests: {}
			},
			result = defaultBuilder.build( sampleData3 );

		expect( result ).to.deep.equal( expected );
	} );
} );
