/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Regressions test page builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	_ = require( 'lodash' ),
	regressions = rewire( '../../lib/pagebuilders/regressions' );

describe( 'Page Builders - Regressions', function() {
	var oldAttach,
		builder,
		bender;

	before( function() {
		oldAttach = regressions.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'conf' );
		regressions.attach = oldAttach || mocks.attachPagebuilder( bender, regressions );
		bender.use( regressions );
		builder = bender.pagebuilders[ 0 ];
	} );

	after( function() {
		regressions.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( regressions.build ).to.be.a( 'function' );
		expect( builder ).to.be.a( 'function' );
	} );

	it( 'should add a script to data parts containing regression information', function() {
		var data = {
				group: 'Test',
				parts: []
			},
			expected = '<head>\n<script>\n(function () {\n' +
			'bender.regressions = ' + JSON.stringify( bender.conf.tests.Test.regressions ) + ';\n' +
			'})();\n</script>\n</head>';

		data = builder( data );

		expect( data.parts ).to.have.length( 1 );
		expect( data.parts[ 0 ] ).to.equal( expected );
	} );

	it( 'should not alter data if no regression information specified for a given group', function() {
		var data = {
				group: 'Test2',
				parts: []
			},
			result = _.cloneDeep( builder( data ) );

		expect( result ).to.deep.equal( data );
	} );
} );
