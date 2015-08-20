/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Includes test page builder
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
	template = require( '../../lib/template' ),
	utils = require( '../../lib/utils' ),
	includes = rewire( '../../lib/pagebuilders/includes' );

describe( 'Page Builders - Includes', function() {
	var oldAttach,
		builder,
		bender;

	before( function() {
		oldAttach = includes.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'conf', 'jobs' );
		includes.attach = oldAttach || mocks.attachPagebuilder( bender, 'includes', includes );
		bender.use( [ utils, template, includes ] );
		builder = bender.pagebuilders.get( 'includes' );
	} );

	after( function() {
		includes.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( includes.build ).to.be.a( 'function' );
		expect( builder ).to.be.a( 'function' );
	} );

	it( 'should not alter data if no includes defined in data', function() {
		var data = {
			id: 'foo',
			framework: 'bar',
			applications: {},
			group: 'Test',
			parts: []
		};

		expect( builder( _.cloneDeep( data ) ) ).to.deep.equal( data );
	} );

	it( 'should call addJS for each source defined in data.include array', function() {
		var spy = sinon.spy(),
			data = {
				id: 'foo',
				framework: 'bar',
				applications: {},
				group: 'Test',
				include: [ 'foo/bar.js', 'baz/test.js' ],
				addJS: spy
			};

		builder( data );

		sinon.assert.calledTwice( spy );
		sinon.assert.calledWithExactly( spy, 'foo/bar.js' );
		sinon.assert.calledWithExactly( spy, 'baz/test.js' );
	} );

	it( 'should support %BASE_PATH% and %TEST_DIR% tags in include paths', function() {
		var spy = sinon.spy(),
			data = {
				id: 'test/fixtures/tests/bar/baz',
				framework: 'bar',
				applications: {},
				group: 'Test',
				include: [ '%TEST_DIR%foo/bar.js', '%BASE_PATH%baz/test.js' ],
				addJS: spy
			};

		builder( data );

		sinon.assert.calledTwice( spy );
		sinon.assert.calledWithExactly( spy, '/test/fixtures/tests/bar/foo/bar.js' );
		sinon.assert.calledWithExactly( spy, '/test/fixtures/tests/baz/test.js' );
	} );
} );
