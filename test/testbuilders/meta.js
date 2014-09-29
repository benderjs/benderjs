/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
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
	meta = rewire( '../../lib/testbuilders/meta' ),
	_ = require( 'lodash' ),
	files = require( '../../lib/files' );

describe( 'Test Builders - Meta', function() {
	var test1 = normalize( 'test/fixtures/tests/test/1' ),
		test2 = normalize( 'test/fixtures/tests/test/2' ),
		test3 = normalize( 'test/fixtures/tests/test/3' ),
		test4 = normalize( 'test/fixtures/tests/test2/1' ),
		test5 = normalize( 'test/fixtures/tests/test2/2' ),
		test6 = normalize( 'test/fixtures/tests/test2/3' ),
		sampleData = {},
		sampleData2 = {},
		sampleData3 = {},
		sampleData4 = {},
		sampleData5 = {},
		sampleData6 = {},
		sampleData7 = {},
		oldAttach,
		bender;

	sampleData.tests = {};
	sampleData.tests[ test1 ] = {
		id: 'test/fixtures/tests/test/1',
		js: 'test/fixtures/tests/test/1.js',
		html: 'test/fixtures/tests/test/1.html',
		unit: true
	};

	sampleData2.tests = {};
	sampleData2.tests[ test2 ] = {
		id: 'test/fixtures/tests/test/2',
		js: 'test/fixtures/tests/test/2.js',
		html: 'test/fixtures/tests/test/2.htm',
		unit: true
	};

	sampleData3.tests = {};
	sampleData3.tests[ test3 ] = {
		id: 'test/fixtures/tests/test/3',
		js: 'test/fixtures/tests/test/3.js',
		unit: true
	};

	sampleData4.tests = {};
	sampleData4.tests[ test4 ] = {
		id: 'test/fixtures/tests/test2/1',
		js: 'test/fixtures/tests/test2/1.js',
		unit: true
	};

	sampleData5.tests = {};
	sampleData5.tests[ test5 ] = {
		id: 'test/fixtures/tests/test2/2',
		js: 'test/fixtures/tests/test2/2.js',
		unit: true
	};

	sampleData6.tests = {};
	sampleData6.tests[ test6 ] = {
		id: 'test/fixtures/tests/test2/3',
		js: 'test/fixtures/tests/test2/3.js',
		script: 'test/fixtures/tests/test2/3.md',
		unit: true,
		manual: true
	};

	sampleData7.tests = {};
	sampleData7.tests[ test6 ] = {
		id: 'test/fixtures/tests/test2/3',
		script: 'test/fixtures/tests/test2/3.md',
		unit: false,
		manual: true
	};

	before( function() {
		oldAttach = meta.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'utils', 'conf' );
		meta.attach = oldAttach || mocks.attachPagebuilder( bender, meta );
		bender.use( [ meta, files ] );
	} );

	after( function() {
		meta.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( meta.build ).to.be.a( 'function' );
	} );

	it( 'should parse default meta data', function() {
		var expected = {};

		expected[ test1 ] = _.merge( {
			tags: [ 'foo', 'bar', 'baz' ],
			ui: 'collapsed',
			include: [ 'http://foo.com/bar/baz.js' ]
		}, sampleData.tests[ test1 ] );

		return meta.build( sampleData ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );

	it( 'should parse custom meta data', function() {
		var expected = {};

		expected[ test2 ] = _.merge( {
			tags: [ 'foo', 'bar', 'baz' ],
			testPlugin: {
				flag: 'foo'
			}
		}, sampleData2.tests[ test2 ] );

		return meta.build( sampleData2 ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );

	it( 'should handle tests with no meta data and add tags built from test\'s path', function() {
		var expected = {};

		expected[ test3 ] = _.merge( {
			tags: []
		}, sampleData3.tests[ test3 ] );

		return meta.build( sampleData3 ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );

	it( 'should remove duplicated tags', function() {
		var expected = {};


		expected[ test4 ] = _.merge( {
			tags: [
				'foo',
				'bar',
				'baz',
				'fixtures'
			]
		}, sampleData4.tests[ test4 ] );

		return meta.build( sampleData4 ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );

	it( 'should ignore broken meta data', function() {
		var expected = {};


		expected[ test5 ] = _.merge( {
			tags: [
				'foo',
				'bar',
				'baz'
			]
		}, sampleData5.tests[ test5 ] );

		return meta.build( sampleData5 ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );

	it( 'should merge metadata found in js and md files', function() {
		var expected = {};

		expected[ test6 ] = _.merge( {
			tags: [
				'foo',
				'bar',
				'baz',
				'quux',
				'qux'
			]
		}, sampleData6.tests[ test6 ] );

		return meta.build( sampleData6 ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );

	it( 'should build metadata for a manual test', function() {
		var expected = {};

		expected[ test6 ] = _.merge( {
			tags: [
				'quux',
				'qux'
			]
		}, sampleData7.tests[ test6 ] );

		return meta.build( sampleData7 ).then( function( result ) {
			expect( result.tests ).to.deep.equal( expected );
		} );
	} );
} );
