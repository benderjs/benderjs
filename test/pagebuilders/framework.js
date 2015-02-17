/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Framework test page builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	_ = require( 'lodash' ),
	framework = rewire( '../../lib/pagebuilders/framework' );

describe( 'Page Builders - Framework', function() {
	var oldAttach,
		builder,
		bender;

	before( function() {
		oldAttach = framework.attach;
		bender = mocks.getBender( 'applications', 'plugins' );
		framework.attach = oldAttach || mocks.attachPagebuilder( bender, 'framework', framework );
		bender.use( framework );
		builder = bender.pagebuilders.get( 'framework' );
	} );

	after( function() {
		framework.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( framework.build ).to.be.a( 'function' );
		expect( builder ).to.be.a( 'function' );
	} );

	it( 'should return <script> tag for defined framework library\'s script', function() {
		var data = {
				framework: 'test',
				parts: []
			},
			expected = '<head><script src="framework-test/adapter.js"></script></head>',
			result = builder( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );

	it( 'should return <link> tag for each defined framework library\'s stylesheet', function() {
		var data = {
				framework: 'test2',
				parts: []
			},
			expected = '<head><link rel="stylesheet" href="framework-test/test.css"></head>',
			result = builder( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );

	it( 'should not modify data if no framework defined', function() {
		var data = {
				parts: []
			},
			result = framework.build( _.cloneDeep( data ) );

		expect( result ).to.deep.equal( data );
	} );
} );
