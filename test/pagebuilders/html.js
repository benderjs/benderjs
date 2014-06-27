/**
 * @file Tests for Html test page builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	path = require( 'path' ),
	srcHtml = require( 'fs' ).readFileSync(
		require( 'path' ).join( __dirname, '../fixtures/tests/test/1.html' )
	).toString(),
	html = rewire( '../../lib/pagebuilders/html' );

describe( 'Page Builders - Html', function() {
	var oldAttach,
		bender;

	before( function() {
		oldAttach = html.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'pagebuilders', 'utils' );
		html.attach = oldAttach || mocks.attachPagebuilder( bender, html );
		bender.use( html );
	} );

	after( function() {
		html.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( html.build ).to.be.a( 'function' );
	} );

	it( 'should add a promise for html to given data parts', function() {
		var data = {
			html: path.resolve( __dirname, '../fixtures/tests/test/1.html' ),
			parts: []
		};

		data = html.build( data );

		expect( data.parts[ 0 ] ).to.exist;

		return data.parts[ 0 ].then( function( result ) {
			expect( result ).to.equal( srcHtml );
		} );
	} );

	it( 'should not alter data if no html specified', function() {
		var data = {
			parts: []
		};

		data = html.build( data );

		expect( data ).to.equal( data );
	} );
} );
