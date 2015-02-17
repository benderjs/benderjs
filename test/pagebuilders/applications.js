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
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	_ = require( 'lodash' ),
	applications = rewire( '../../lib/pagebuilders/applications' );

describe( 'Page Builders - Applications', function() {
	var oldAttach,
		bender;

	before( function() {
		oldAttach = applications.attach;
		bender = mocks.getBender( 'applications', 'plugins' );
		applications.attach = oldAttach || mocks.attachPagebuilder( bender, 'applications', applications );
		bender.use( applications );
	} );

	after( function() {
		applications.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( applications.build ).to.be.a( 'function' );
	} );

	it( 'should return <script> tag for each defined application\'s script', function() {
		var data = {
				applications: [ {
					url: 'test/',
					path: 'test/fixtures/apps/',
					files: [ 'test.js' ],
					js: [ 'test.js' ],
					css: []
				} ],
				parts: []
			},
			expected = '<head><script src="test.js"></script></head>',
			result = applications.build( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );

	it( 'should return <link> tag for each defined application\'s stylesheet', function() {
		var data = {
				applications: [ {
					url: 'test/',
					path: 'test/fixtures/apps/',
					files: [ 'test.css' ],
					js: [],
					css: [ 'test.css' ]
				} ],
				parts: []
			},
			expected = '<head><link rel="stylesheet" href="test.css"></head>',
			result = applications.build( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );

	it( 'should not modify data if no apps defined', function() {
		var data = {
				parts: []
			},
			result = applications.build( _.cloneDeep( data ) );

		expect( result ).to.deep.equal( data );
	} );

	it( 'should add scripts and stylesheets of multiple apps', function() {
		var data = {
				applications: [ {
					url: 'test/',
					path: 'test/fixtures/app1/',
					files: [
						'test.js',
						'test.css'
					],
					js: [ 'test.js' ],
					css: [ 'test.css' ]
				}, {
					url: 'test/',
					path: 'test/fixtures/app2/',
					files: [
						'test.js',
						'test.css'
					],
					js: [ 'test.js' ],
					css: [ 'test.css' ]
				} ],
				parts: []
			},
			expected = '<head><link rel="stylesheet" href="test.css"><script src="test.js"></script>' +
			'<link rel="stylesheet" href="test.css"><script src="test.js"></script></head>',
			result = applications.build( data );

		expect( result.parts ).to.have.length( 1 );
		expect( result.parts[ 0 ] ).to.equal( expected );
	} );
} );
