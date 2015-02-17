/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Test Data test page builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	testdata = rewire( '../../lib/pagebuilders/testdata' );

describe( 'Page Builders - Test Data', function() {
	var oldAttach,
		builder,
		bender;

	before( function() {
		oldAttach = testdata.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'conf' );
		testdata.attach = oldAttach || mocks.attachPagebuilder( bender, 'testdata', testdata );
		bender.use( testdata );
		builder = bender.pagebuilders.get( 'testdata' ).bind( bender );
	} );

	after( function() {
		testdata.attach = oldAttach;
	} );

	var testData = {
			_id: 'foo/bar/baz',
			id: 'foo/bar/baz',
			framework: 'bar',
			applications: {},
			group: 'Test',
			parts: []
		},
		taskData = {
			_id: 'foo/bar/baz',
			id: 'foo/bar/baz',
			jobId: '1234567890',
			framework: 'bar',
			applications: {},
			group: 'Test',
			parts: []
		};

	it( 'should expose build function', function() {
		expect( testdata.build ).to.be.a( 'function' );
	} );

	it( 'should add a script to data parts containing test information', function() {
		var pattern = /bender\.testData = (.+);/i,
			data = builder( testData );

		expect( data.parts ).to.have.length( 1 );
		expect( data.parts[ 0 ] ).to.match( pattern );
	} );

	it( 'should strip unwanted test information', function() {
		var pattern = /bender\.testData = (.+);/i,
			result = builder( testData ),
			data = JSON.parse( result.parts[ 0 ].match( pattern )[ 1 ] );

		expect( data ).to.include.key( 'group' );
		expect( data ).to.not.include.keys( [ '_id', 'framework', 'applications', 'parts' ] );
	} );

	it( 'should expose bender.basePath property containing the test\'s basePath', function() {
		var pattern = /bender\.basePath = (.+);/i,
			result = builder( testData );

		result = result.parts[ 0 ];

		var path = result.match( pattern )[ 1 ];

		expect( path ).to.equal( '"/test/fixtures/tests/"' );
	} );

	it( 'should expose bender.basePath property containing the test\'s basePath including the job\'s path', function() {
		var pattern = /bender\.basePath = (.+);/i,
			result = builder( taskData );

		result = result.parts[ 0 ];

		var path = result.match( pattern )[ 1 ];

		expect( path ).to.equal( '"/jobs/1234567890/tests/test/fixtures/tests/"' );
	} );

	it( 'should expose bender.testDir property containing the test\'s basePath', function() {
		var pattern = /bender\.testDir = (.+);/i,
			result = builder( testData );

		result = result.parts[ 0 ];

		var path = result.match( pattern )[ 1 ];

		expect( path ).to.equal( '"/foo/bar/"' );
	} );

	it( 'should expose bender.testDir property containing the test\'s basePath including the job\'s path', function() {
		var pattern = /bender\.testDir = (.+);/i,
			result = builder( taskData );

		result = result.parts[ 0 ];

		var path = result.match( pattern )[ 1 ];

		expect( path ).to.equal( '"/jobs/1234567890/tests/foo/bar/"' );
	} );
} );
