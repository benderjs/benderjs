/**
 * @file Tests for Assertion test page builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	assertion = rewire( '../../lib/pagebuilders/assertion' );

describe( 'Page Builders - Assertion', function() {
	var oldAttach,
		bender;

	before( function() {
		oldAttach = assertion.attach;
		bender = mocks.getBender( 'applications', 'plugins' );
		assertion.attach = oldAttach || mocks.attachPagebuilder( bender, assertion );
		bender.use( assertion );
	} );

	after( function() {
		assertion.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( assertion.build ).to.be.a( 'function' );
	} );

	it( 'should return <script> tag for defined assertion library\'s script', function() {
		var data = {
				assertion: {
					name: 'test',
					files: [ 'test.js' ],
					js: [ 'test.js' ],
					css: []
				},
				parts: []
			},
			expected = '<head><script src="test.js"></script></head>',
			result = assertion.build( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );

	it( 'should return <link> tag for each defined assertion library\'s stylesheet', function() {
		var data = {
				assertion: {
					name: 'test',
					files: [ 'test.css' ],
					js: [],
					css: [ 'test.css' ]
				},
				parts: []
			},
			expected = '<head><link rel="stylesheet" href="test.css"></head>',
			result = assertion.build( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );

	it( 'should not modify data if no apps defined', function() {
		var data = {
				parts: []
			},
			result = assertion.build( data );

		expect( result ).to.equal( data );
	} );
} );
