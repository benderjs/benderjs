/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Html test page builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	when = require( 'when' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	srcHtml = require( 'fs' ).readFileSync(
		require( 'path' ).join( __dirname, '../fixtures/tests/test/1.html' )
	).toString(),
	filesModule = require( '../../lib/files' ),
	html = rewire( '../../lib/pagebuilders/html' );

describe( 'Page Builders - Html', function() {
	var oldAttach,
		builder,
		bender;

	before( function() {
		oldAttach = html.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'pagebuilders', 'utils' );
		html.attach = oldAttach || mocks.attachPagebuilder( bender, html );
		bender.use( [ html, filesModule ] );
		builder = bender.pagebuilders[ 1 ].bind( bender );
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

		data = builder( data );

		expect( data.parts[ 0 ] ).to.exist;
		expect( data.parts[ 0 ] ).to.be.instanceof( when.Promise );

		return data.parts[ 0 ].then( function( result ) {
			expect( result ).to.equal( srcHtml );
		} );
	} );

	it( 'should resolve th promise with HTML code for given data', function() {
		var data = {
			html: path.resolve( __dirname, '../fixtures/tests/test/1.html' ),
			parts: []
		};

		data = builder( data );

		return data.parts[ 0 ].then( function( result ) {
			expect( result ).to.equal( srcHtml );
		} );
	} );

	it( 'should load job\'s HTML from the job\'s directory', function( done ) {
		var data = {
				jobId: 'foo',
				snapshot: true,
				html: 'fixtures/tests/test/1.html',
				parts: []
			},
			expected = path.join( '.bender/jobs/', data.jobId, '/tests/', data.html );

		if ( path.sep === '\\' ) {
			expected = path.resolve( expected );
		}

		function handle( err ) {
			expect( err ).to.equal( 'File not found: .bender/jobs/foo/tests/fixtures/tests/test/1.html' );

			done();
		}

		data = builder( data );

		return data.parts[ 0 ].done( handle, handle );
	} );

	it( 'should not alter data if no html specified', function() {
		var data = {
				parts: []
			},
			result = builder( _.cloneDeep( data ) );

		expect( result ).to.deep.equal( data );
	} );
} );
