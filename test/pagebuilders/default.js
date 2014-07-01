/**
 * @file Tests for Default test page builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	defaultBuilder = rewire( '../../lib/pagebuilders/default' ),
	defaultTemplate = require( 'fs' ).readFileSync(
		require( 'path' ).join( __dirname, '../../static/default.html' )
	).toString();

describe( 'Page Builders - Default', function() {
	var oldAttach,
		bender;

	before( function() {
		oldAttach = defaultBuilder.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'pagebuilders', 'utils' );
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
		expect( bender.pagebuilders[ 0 ] ).to.equal( defaultBuilder.build );
	} );

	it( 'should return a promise for default template on first call', function() {
		var data = {
			parts: []
		};

		data = defaultBuilder.build( data );

		expect( data.parts[ 0 ] ).to.exist;

		return data.parts[ 0 ].then( function( result ) {
			expect( result ).to.equal( defaultTemplate );
		} );
	} );

	it( 'should return a default template on a second and another calls', function() {
		var data = {
			parts: []
		};

		data = defaultBuilder.build( data );

		expect( data.parts[ 0 ] ).to.equal( defaultTemplate );
	} );
} );
