/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Includes test page builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	_ = require( 'lodash' ),
	template = require( '../../lib/template' ),
	utils = require( '../../lib/utils' ),
	includes = rewire( '../../lib/pagebuilders/includes' );

describe( 'Page Builders - Includes', function() {
	var oldAttach,
		bender;

	before( function() {
		oldAttach = includes.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'conf', 'jobs' );
		includes.attach = oldAttach || mocks.attachPagebuilder( bender, includes );
		bender.use( [ utils, template, includes ] );
	} );

	after( function() {
		includes.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( includes.build ).to.be.a( 'function' );
	} );

	it( 'should not alter data if no includes defined in data', function() {
		var data = {
			id: 'foo',
			assertion: 'bar',
			applications: {},
			group: 'Test',
			parts: []
		};

		expect( includes.build( data ) ).to.deep.equal( _.cloneDeep( data ) );
	} );

	it( 'should add a script tag for each source defined in data.include array', function() {
		var data = {
				id: 'foo',
				assertion: 'bar',
				applications: {},
				group: 'Test',
				include: 'foo/bar.js, baz/test.js',
				parts: []
			},
			expected = '<head>\n<script src="foo/bar.js"></script>\n<script src="baz/test.js"></script>\n</head>',
			result = includes.build( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );

	it( 'should support %BASE_PATH% and %TEST_DIR% tags in include paths', function() {
		var data = {
				id: 'test/fixtures/tests/bar/baz',
				assertion: 'bar',
				applications: {},
				group: 'Test',
				include: '%TEST_DIR%foo/bar.js, %BASE_PATH%baz/test.js',
				parts: []
			},
			expected = '<head>\n<script src="/test/fixtures/tests/bar/foo/bar.js"></script>\n' +
			'<script src="/test/fixtures/tests/baz/test.js"></script>\n</head>',
			result = includes.build( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );
} );
