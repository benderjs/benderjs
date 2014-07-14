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
	vm = require( 'vm' ),
	_ = require( 'lodash' ),
	testdata = rewire( '../../lib/pagebuilders/testdata' );

describe( 'Page Builders - Test Data', function() {
	var oldAttach,
		bender;

	before( function() {
		oldAttach = testdata.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'conf' );
		testdata.attach = oldAttach || mocks.attachPagebuilder( bender, testdata );
		bender.use( testdata );
	} );

	after( function() {
		testdata.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( testdata.build ).to.be.a( 'function' );
	} );

	it( 'should add a script to data parts containing test information', function() {
		var data = {
				_id: 'foo',
				framework: 'bar',
				applications: {},
				group: 'Test',
				parts: []
			},
			pattern = /bender\.testData = (.+);/i;

		data = testdata.build( data );

		expect( data.parts ).to.have.length( 1 );
		expect( data.parts[ 0 ] ).to.match( pattern );
	} );

	it( 'should strip unwanted test information', function() {
		var data = {
				_id: 'foo',
				framework: 'bar',
				applications: {},
				group: 'Test',
				parts: []
			},
			pattern = /bender\.testData = (.+);/i,
			result = testdata.build( data ),
			testData = JSON.parse( result.parts[ 0 ].match( pattern )[ 1 ] );

		expect( testData ).to.include.key( 'group' );
		expect( testData ).to.not.include.keys( [ '_id', 'framework', 'applications', 'parts' ] );
	} );
} );
