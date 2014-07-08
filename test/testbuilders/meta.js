/**
 * @file Tests for Metadata test builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	normalize = require( 'path' ).normalize,
	meta = rewire( '../../lib/testbuilders/meta' );

describe( 'Test Builders - Meta', function() {
	var test1 = normalize( 'test/fixtures/tests/test/1' ),
		test2 = normalize( 'test/fixtures/tests/test/2' ),
		test3 = normalize( 'test/fixtures/tests/test/3' ),
		test4 = normalize( 'test/fixtures/tests/test2/1' ),
		test5 = normalize( 'test/fixtures/tests/test2/2' ),
		sampleData = {},
		sampleData2 = {},
		sampleData3 = {},
		sampleData4 = {},
		sampleData5 = {},
		oldAttach,
		bender;

	sampleData.tests = {};
	sampleData.tests[ test1 ] = {
		id: 'test/fixtures/tests/test/1',
		js: 'test/fixtures/tests/test/1.js',
		html: 'test/fixtures/tests/test/1.html'
	};

	sampleData2.tests = {};
	sampleData2.tests[ test2 ] = {
		id: 'test/fixtures/tests/test/2',
		js: 'test/fixtures/tests/test/2.js',
		html: 'test/fixtures/tests/test/2.htm'
	};

	sampleData3.tests = {};
	sampleData3.tests[ test3 ] = {
		id: 'test/fixtures/tests/test/3',
		js: 'test/fixtures/tests/test/3.js'
	};

	sampleData4.tests = {};
	sampleData4.tests[ test4 ] = {
		id: 'test/fixtures/tests/test2/1',
		js: 'test/fixtures/tests/test2/1.js'
	};

	sampleData5.tests = {};
	sampleData5.tests[ test5 ] = {
		id: 'test/fixtures/tests/test2/2',
		js: 'test/fixtures/tests/test2/2.js'
	};

	before( function() {
		oldAttach = meta.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'utils', 'conf' );
		meta.attach = oldAttach || mocks.attachPagebuilder( bender, meta );
		bender.use( meta );
	} );

	after( function() {
		meta.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( meta.build ).to.be.a( 'function' );
	} );

	it( 'should parse default meta data', function() {
		var expected = {};

		expected[ test1 ] = {
			id: 'test/fixtures/tests/test/1',
			js: 'test/fixtures/tests/test/1.js',
			html: 'test/fixtures/tests/test/1.html',
			tags: [ 'fixtures', 'tests', 'test', 'foo', 'bar', 'baz' ],
			ui: 'collapsed',
			include: 'http://foo.com/bar/baz.js'
		};

		return meta.build( sampleData ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );

	it( 'should parse custom meta data', function() {
		var expected = {};

		expected[ test2 ] = {
			id: 'test/fixtures/tests/test/2',
			js: 'test/fixtures/tests/test/2.js',
			html: 'test/fixtures/tests/test/2.htm',
			tags: [ 'fixtures', 'tests', 'test', 'foo', 'bar', 'baz' ],
			testPlugin: {
				flag: 'foo'
			}
		};

		return meta.build( sampleData2 ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );

	it( 'should handle tests with no meta data and add tags built from test\'s path', function() {
		var expected = {};

		expected[ test3 ] = {
			id: 'test/fixtures/tests/test/3',
			js: 'test/fixtures/tests/test/3.js',
			tags: [
				'fixtures',
				'tests',
				'test'
			]
		};

		return meta.build( sampleData3 ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );

	it( 'should remove duplicated tags', function() {
		var expected = {};


		expected[ test4 ] = {
			id: 'test/fixtures/tests/test2/1',
			js: 'test/fixtures/tests/test2/1.js',
			tags: [
				'fixtures',
				'tests',
				'test2',
				'foo',
				'bar',
				'baz'
			]
		};

		return meta.build( sampleData4 ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );

	it( 'should ignore broken meta data', function() {
		var expected = {};


		expected[ test5 ] = {
			id: 'test/fixtures/tests/test2/2',
			js: 'test/fixtures/tests/test2/2.js',
			tags: [
				'fixtures',
				'tests',
				'test2',
				'foo',
				'bar',
				'baz'
			]
		};

		return meta.build( sampleData5 ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );
} );
