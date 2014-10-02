/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
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
	filesModule = require( '../../lib/files' ),
	defaultTemplate = require( 'fs' ).readFileSync(
		require( 'path' ).join( __dirname, '../../static/default.html' )
	).toString();

describe( 'Page Builders - Default', function() {
	var oldAttach,
		builder,
		bender;

	before( function() {
		oldAttach = defaultBuilder.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'pagebuilders', 'utils' );
		defaultBuilder.attach = oldAttach || mocks.attachPagebuilder( bender, defaultBuilder );
		bender.use( [ filesModule, defaultBuilder ] );
		builder = bender.pagebuilders[ 0 ].bind( bender );
	} );

	after( function() {
		defaultBuilder.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( defaultBuilder.build ).to.be.a( 'function' );
	} );

	it( 'should return a promise for default template on first call', function() {
		var data = {
			parts: []
		};

		data = builder( data );

		expect( data.parts[ 0 ] ).to.exist;

		return data.parts[ 0 ].then( function( result ) {
			expect( result ).to.equal( defaultTemplate );
		} );
	} );
} );
