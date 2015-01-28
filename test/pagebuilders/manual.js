/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Manual test page builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	path = require( 'path' ),
	_ = require( 'lodash' ),
	template = require( '../../lib/template' ),
	filesModule = require( '../../lib/files' ),
	utils = require( '../../lib/utils' ),
	manual = rewire( '../../lib/pagebuilders/manual' );

describe( 'Page Builders - Includes', function() {
	var oldAttach,
		builder,
		bender;

	before( function() {
		oldAttach = manual.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'conf', 'jobs' );
		manual.attach = oldAttach || mocks.attachPagebuilder( bender, 'manual', manual );
		bender.use( [ utils, template, filesModule, manual ] );
		builder = bender.pagebuilders.get( 'manual' ).bind( bender );
	} );

	after( function() {
		manual.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( manual.build ).to.be.a( 'function' );
		expect( builder ).to.be.a( 'function' );
	} );

	it( 'should not alter data if no manual flag set to true', function() {
		var data = {
			id: 'foo',
			framework: 'bar',
			applications: {},
			group: 'Test',
			parts: []
		};

		expect( builder( _.cloneDeep( data ) ) ).to.deep.equal( data );
	} );

	it( 'should add a promise for a template for a manual test page', function() {
		var data = {
			id: 'test/fixtures/tests/test2/3',
			js: 'test/fixtures/tests/test2/3.js',
			manual: true,
			script: 'test/fixtures/tests/test2/3.md',
			parts: []
		};

		var result = builder( data );

		var promise = result.parts[ 0 ];

		return promise.then( function( result ) {
			expect( result ).to.be.a( 'string' );

			// TODO compare the contents
		} );
	} );

	it( 'should handle a manual test in a job', function() {
		// a hack to force bender.files to read files form the test fixtures >>>
		var oldFileGet = bender.files.get;

		bender.files.get = function( file ) {
			return oldFileGet( path.join( 'test/fixtures/tests/', file ).replace( /\\/g, '/' ) );
		};

		var oldDirname = manual.__get__( '__dirname' );

		manual.__set__( '__dirname', '../' );
		// <<< a hack to force bender.files to read files form the test fixtures >>>

		var data = {
			id: 'test2/3',
			js: 'test2/3.js',
			jobId: 'AYIlcxZa1i1nhLox',
			manual: true,
			script: 'test2/3.md',
			snapshot: true,
			parts: []
		};

		var result = builder( data );

		var promise = result.parts[ 0 ];

		return promise.then( function( result ) {
			expect( result ).to.be.a( 'string' );

			// TODO compare the contents
		} ).finally( function() {
			bender.files.get = oldFileGet;
			manual.__set__( '__dirname', oldDirname );
		} );
	} );

	it( 'should strip test directives from the produced html', function() {
		var data = {
				id: 'test/fixtures/tests/test2/4',
				js: 'test/fixtures/tests/test2/4.js',
				manual: true,
				script: 'test/fixtures/tests/test2/4.md',
				parts: []
			},
			pattern = /@bender\-([\w\-]+)\:([\w \-\.\/\\\:\?\+\$@~_,=#%';!]+)/gi,
			result = builder( data ),
			promise = result.parts[ 0 ];

		return promise.then( function( result ) {
			expect( result ).to.be.a( 'string' );
			expect( result ).to.not.match( pattern );
		} );
	} );
} );
