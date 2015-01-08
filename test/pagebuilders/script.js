/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Script test page builder
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
	srcScript = require( 'fs' ).readFileSync(
		require( 'path' ).join( __dirname, '../fixtures/tests/test/1.js' )
	).toString(),
	filesModule = require( '../../lib/files' ),
	script = rewire( '../../lib/pagebuilders/script' );

describe( 'Page Builders - Script', function() {
	var oldAttach,
		builder,
		bender;

	before( function() {
		oldAttach = script.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'pagebuilders', 'utils' );
		script.attach = oldAttach || mocks.attachPagebuilder( bender, 'script', script );
		bender.use( [ script, filesModule ] );
		builder = bender.pagebuilders.get( 'script' ).bind( bender );
	} );

	after( function() {
		script.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( script.build ).to.be.a( 'function' );
	} );

	it( 'should add a promise for test script to given data parts', function() {
		var data = {
			js: path.resolve( __dirname, '../fixtures/tests/test/1.js' ),
			parts: []
		};

		data = builder( data );

		expect( data.parts[ 0 ] ).to.exist;
		expect( data.parts[ 0 ] ).to.be.instanceof( when.Promise );
	} );

	it( 'should return a script for given data wrapped in a closure', function() {
		var data = {
			js: path.resolve( __dirname, '../fixtures/tests/test/1.js' ),
			parts: []
		};

		data = builder( data );

		return data.parts[ 0 ].then( function( result ) {
			expect( result ).to.equal( '<script>\n(function (bender) {\n' + srcScript +
				'\n})(window.bender || {});\n</script>' );
		} );
	} );

	it( 'should load job\'s script from the job\'s directory', function() {
		var data = {
				jobId: 'foo',
				snapshot: true,
				js: 'fixtures/tests/test/1.js',
				parts: []
			},
			expected = '.bender/jobs/' + data.jobId + '/tests/' + data.js;

		function handle( err ) {
			expect( err ).to.equal( 'File not found: ' + expected.replace( /\//g, path.sep ) );
		}

		data = builder( data );

		return data.parts[ 0 ].then( handle, handle );
	} );

	it( 'should not alter data if no script specified', function() {
		var data = {
				parts: []
			},
			result = builder( _.cloneDeep( data ) );

		expect( result ).to.deep.equal( data );
	} );
} );
