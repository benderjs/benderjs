/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Framework test page builder
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
	framework = rewire( '../../lib/pagebuilders/framework' );

describe( 'Page Builders - Framework', function() {
	var oldAttach,
		builder,
		bender;

	before( function() {
		oldAttach = framework.attach;
		bender = mocks.getBender( 'applications', 'plugins' );
		framework.attach = oldAttach || mocks.attachPagebuilder( bender, 'framework', framework );
		bender.use( framework );
		builder = bender.pagebuilders.get( 'framework' );
	} );

	after( function() {
		framework.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( framework.build ).to.be.a( 'function' );
		expect( builder ).to.be.a( 'function' );
	} );

	it( 'should call addJS for defined framework library\'s script', function() {
		var spy = sinon.spy(),
			data = {
				framework: 'test',
				addJS: spy
			};

		builder( data );

		sinon.assert.calledOnce( spy );
		sinon.assert.calledWithExactly( spy, 'framework-test/adapter.js' );
	} );

	it( 'should call addCSS for each defined framework library\'s stylesheet', function() {
		var spy = sinon.spy(),
			data = {
				framework: 'test2',
				addCSS: spy
			};

		builder( data );

		sinon.assert.calledOnce( spy );
		sinon.assert.calledWithExactly( spy, 'framework-test/test.css' );
	} );

	it( 'should not modify data if no framework defined', function() {
		var data = {
				parts: []
			},
			result = framework.build( _.cloneDeep( data ) );

		expect( result ).to.deep.equal( data );
	} );
} );
