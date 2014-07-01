/**
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
		bender;

	before( function() {
		oldAttach = regressions.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'conf' );
		regressions.attach = oldAttach || mocks.attachPagebuilder( bender, regressions );
		bender.use( regressions );
	} );

	after( function() {
		regressions.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( regressions.build ).to.be.a( 'function' );
	} );

	it( 'should add a script to data parts containing regression information', function() {
		var data = {
				group: 'Test',
				parts: []
			},
			expected = '<head>\n<script>\n(function () {\n' +
			'bender.regressions = ' + JSON.stringify( bender.conf.tests.Test.regressions ) + ';\n' +
			'})();\n</script>\n</head>';

		data = regressions.build( data );

		expect( data.parts ).to.have.length( 1 );
		expect( data.parts[ 0 ] ).to.equal( expected );
	} );

	it( 'should not alter data if no regression information specified for a given group', function() {
		var data = {
				group: 'Test2',
				parts: []
			},
			result = _.cloneDeep( regressions.build( data ) );

		expect( result ).to.deep.equal( data );
	} );
} );
