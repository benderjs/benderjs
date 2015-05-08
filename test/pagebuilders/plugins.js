/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Plugins test page builder
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
	plugins = rewire( '../../lib/pagebuilders/plugins' );

describe( 'Page Builders - Plugins', function() {
	var oldAttach,
		builder,
		bender;

	before( function() {
		oldAttach = plugins.attach;
		bender = mocks.getBender( 'applications', 'plugins' );
		plugins.attach = oldAttach || mocks.attachPagebuilder( bender, 'plugins', plugins );
		bender.use( plugins );
		builder = bender.pagebuilders.get( 'plugins' );
	} );

	after( function() {
		plugins.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( plugins.build ).to.be.a( 'function' );
		expect( builder ).to.be.a( 'function' );
	} );

	it( 'should add files included from plugins to the data parts', function() {
		var addCSSSpy = sinon.spy(),
			addJSSpy = sinon.spy(),
			data = {
				addCSS: addCSSSpy,
				addJS: addJSSpy
			};

		builder( _.cloneDeep( data ) );

		sinon.assert.calledOnce( addCSSSpy );
		sinon.assert.calledWithExactly( addCSSSpy, '/plugins/framework-test/test.css' );

		sinon.assert.calledOnce( addJSSpy );
		sinon.assert.calledWithExactly( addJSSpy, '/plugins/framework-test/adapter.js' );
	} );

	it( 'should not modify data if no includes defined', function() {
		var data = {
				parts: []
			},
			result;

		bender.plugins._include = {
			css: [],
			js: []
		};

		result = builder( _.cloneDeep( data ) );

		expect( result ).to.deep.equal( data );
	} );
} );
