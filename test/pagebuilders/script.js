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
	script = rewire( '../../lib/pagebuilders/script' );

describe( 'Page Builders - Script', function() {
	var oldAttach,
		bender;

	before( function() {
		oldAttach = script.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'pagebuilders', 'utils' );
		script.attach = oldAttach || mocks.attachPagebuilder( bender, script );
		bender.use( script );
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

		data = script.build( data );

		expect( data.parts[ 0 ] ).to.exist;
		expect( data.parts[ 0 ] ).to.be.instanceof( when.Promise );
	} );

	it( 'should return a script for given data wrapped in a closure', function() {
		var data = {
			js: path.resolve( __dirname, '../fixtures/tests/test/1.js' ),
			parts: []
		};

		data = script.build( data );

		return data.parts[ 0 ].then( function( result ) {
			expect( result ).to.equal( '<script>\n(function (bender) {\n' + srcScript +
				'\n})(window.bender || {});\n</script>' );
		} );
	} );

	it( 'should load job\'s script from the job\'s directory', function() {
		var data = {
				jobId: 'foo',
				js: 'fixtures/tests/test/1.js',
				parts: []
			},
			expected = path.join( '.bender/jobs/', data.jobId, '/tests/', data.js );

		if ( path.sep === '\\' ) {
			expected = path.resolve( expected );
		}

		function handle( err ) {
			expect( err ).to.be.an( 'object' );
			expect( err.code ).to.equal( 'ENOENT' );
			expect( err.path ).to.equal( expected );
		}

		data = script.build( data );

		return data.parts[ 0 ].done( handle, handle );
	} );

	it( 'should not alter data if no script specified', function() {
		var data = {
				parts: []
			},
			result = _.cloneDeep( script.build( data ) );

		expect( result ).to.deep.equal( data );
	} );
} );
