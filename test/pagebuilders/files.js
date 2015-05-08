/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Applications test page builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	sinon = require( 'sinon' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	_ = require( 'lodash' ),
	files = rewire( '../../lib/pagebuilders/files' );

describe( 'Page Builders - Applications', function() {
	var oldAttach,
		bender;

	before( function() {
		oldAttach = files.attach;
		bender = mocks.getBender( 'applications', 'plugins' );
		files.attach = oldAttach || mocks.attachPagebuilder( bender, 'files', files );
		bender.use( files );
	} );

	after( function() {
		files.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( files.build ).to.be.a( 'function' );
	} );

	it( 'should add script and css link for each file in files', function() {
		var data = {
				files: {
					js: [
						{ url: 'test1.js', options: {} },
						{ url: 'test2.js', options: { body: false } },
						{ url: 'test3.js', options: { body: true } }
					],
					css: [
						{ url: 'test1.css', options: {} },
						{ url: 'test2.css', options: { body: false } },
						{ url: 'test3.css', options: { body: true } }
					]
				},
				parts: []
			},
			expectedHead = '<head><link rel="stylesheet" href="test1.css"><link rel="stylesheet" href="test2.css">' +
				'<script src="test1.js"></script><script src="test2.js"></script></head>',
			expectedBody = '<body><link rel="stylesheet" href="test3.css"><script src="test3.js"></script></body>',
			result = files.build( data );

		expect( result.parts ).to.have.length( 2 );
		expect( result.parts[ 0 ] ).to.equal( expectedHead );
		expect( result.parts[ 1 ] ).to.equal( expectedBody );
	} );

	it( 'should add just the head part if there is just head to be added', function() {
		var data = {
				files: {
					js: [
						{ url: 'test1.js', options: {} }
					],
					css: []
				},
				parts: []
			},
			expected = '<head><script src=\"test1.js\"></script></head>',
			result = files.build( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );

	it( 'should add just the body part if there is just body to be added', function() {
		var data = {
				files: {
					js: [
						{ url: 'test1.js', options: { body: true } }
					],
					css: []
				},
				parts: []
			},
			expected = '<body><script src=\"test1.js\"></script></body>',
			result = files.build( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );
} );
