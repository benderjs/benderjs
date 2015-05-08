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

	it( 'should call addJS for each defined application\'s script', function() {
		var spy = sinon.spy(),
			data = {
				applications: [ {
					url: 'test/',
					path: 'test/fixtures/apps/',
					files: [ 'test.js' ],
					js: [ 'test.js' ],
					css: []
				} ],
				addJS: spy
			};

		applications.build( data );

		sinon.assert.calledOnce( spy );
		sinon.assert.calledWithExactly( spy, 'test.js' );

	} );

	it( 'should call addCSS for each defined application\'s stylesheet', function() {
		var spy = sinon.spy(),
			data = {
				applications: [ {
					url: 'test/',
					path: 'test/fixtures/apps/',
					files: [ 'test.css' ],
					js: [],
					css: [ 'test.css' ]
				} ],
				addCSS: spy
			};

		applications.build( data );

		sinon.assert.calledOnce( spy );
		sinon.assert.calledWithExactly( spy, 'test.css' );
	} );

	it( 'should not modify data if no apps defined', function() {
		var data = {
				parts: []
			},
			result = applications.build( _.cloneDeep( data ) );

		expect( result ).to.deep.equal( data );
	} );

	it( 'should add scripts and stylesheets of multiple apps', function() {
		var addCSSSpy = sinon.spy(),
			addJSSpy = sinon.spy(),
			data = {
				applications: [ {
					url: 'test/',
					path: 'test/fixtures/app1/',
					files: [
						'test1.js',
						'test1.css'
					],
					js: [ 'test1.js' ],
					css: [ 'test1.css' ]
				}, {
					url: 'test/',
					path: 'test/fixtures/app2/',
					files: [
						'test2.js',
						'test2.css'
					],
					js: [ 'test2.js' ],
					css: [ 'test2.css' ]
				} ],
				addCSS: addCSSSpy,
				addJS: addJSSpy
			};

		applications.build( data );

		sinon.assert.calledTwice( addCSSSpy );
		sinon.assert.calledWithExactly( addCSSSpy, 'test1.css' );
		sinon.assert.calledWithExactly( addCSSSpy, 'test2.css' );

		sinon.assert.calledTwice( addJSSpy );
		sinon.assert.calledWithExactly( addJSSpy, 'test1.js' );
		sinon.assert.calledWithExactly( addJSSpy, 'test2.js' );
	} );
} );
