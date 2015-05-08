/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Template module
 */

/*global describe, it, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	_ = require( 'lodash' ),
	applications = require( '../lib/applications' ),
	utils = require( '../lib/utils' ),
	when = require( 'when' ),
	template = rewire( '../lib/template' );

describe( 'Template', function() {
	var basePathHtml = '<!DOCTYPE html><html><head></head><body>' +
		'<img src="%BASE_PATH%_assets/img.jpg" /></body></html>',
		testDirHtml = '<!DOCTYPE html><html><head></head><body>' +
		'<img src="%TEST_DIR%_assets/img.jpg" /></body></html>',
		appsDirHtml = '<!DOCTYPE html><html><head></head><body>' +
		'<img src="%APPS_DIR%foo/img.jpg" /></body></html>',
		bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'jobs', 'pagebuilders', 'plugins', 'tests', 'utils', 'files' );
		bender.use( [ applications, utils, template ] );
		bender.init();
	} );

	it( 'should create "template" namespace in Bender when attached', function() {
		expect( bender.template ).to.be.an( 'object' );
		expect( bender.template ).to.include.keys( [ 'build', 'replaceTags' ] );
	} );

	it( 'should replace %BASE_PATH% tag in test\'s HTML', function() {
		var expected = '<!DOCTYPE html><html><head></head><body>' +
			'<img src="/test/fixtures/tests/_assets/img.jpg" /></body></html>',
			result = bender.template.replaceTags( basePathHtml, bender.tests.tests[ 0 ] );

		expect( result ).to.equal( expected );
	} );

	it( 'should replace %BASE_PATH% tag in job task\'s HTML', function() {
		var jobId = 'foo',
			expected = '<!DOCTYPE html><html><head></head><body><img src="/jobs/' + jobId +
			'/tests/test/fixtures/tests/_assets/img.jpg" /></body></html>',
			task = _.extend( {
				jobId: jobId
			}, bender.tests.tests[ 0 ] ),
			result = bender.template.replaceTags( basePathHtml, task );

		expect( result ).to.equal( expected );
	} );

	it( 'should replace %TEST_DIR% tag in test\'s HTML', function() {
		var expected = '<!DOCTYPE html><html><head></head><body>' +
			'<img src="/test/fixtures/tests/test/_assets/img.jpg" /></body></html>',
			result = bender.template.replaceTags( testDirHtml, bender.tests.tests[ 0 ] );

		expect( result ).to.equal( expected );
	} );

	it( 'should replace %TEST_DIR% tag in job task\'s HTML', function() {
		var jobId = 'foo',
			expected = '<!DOCTYPE html><html><head></head><body><img src="/jobs/' + jobId +
			'/tests/test/fixtures/tests/test/_assets/img.jpg" /></body></html>',
			task = _.extend( {
				jobId: jobId
			}, bender.tests.tests[ 0 ] ),
			result = bender.template.replaceTags( testDirHtml, task );

		expect( result ).to.equal( expected );
	} );

	it( 'should replace %APPS_DIR% tag in test\'s HTML', function() {
		var expected = '<!DOCTYPE html><html><head></head><body>' +
			'<img src="/apps/foo/img.jpg" /></body></html>',
			result = bender.template.replaceTags( appsDirHtml, bender.tests.tests[ 0 ] );

		expect( result ).to.equal( expected );
	} );

	it( 'should replace %APPS_DIR% tag in job task\'s HTML', function() {
		var jobId = 'foo',
			expected = '<!DOCTYPE html><html><head></head><body><img src="/jobs/' + jobId +
			'/apps/foo/img.jpg" /></body></html>',
			task = _.extend( {
				jobId: jobId
			}, bender.tests.tests[ 0 ] ),
			result = bender.template.replaceTags( appsDirHtml, task );

		expect( result ).to.equal( expected );
	} );

	it( 'should build HTML for a test', function() {
		var expected = '<!DOCTYPE html><html><head></head><body>' +
			'<img src="/test/fixtures/tests/_assets/img.jpg"></body></html>',
			promise = bender.template.build( bender.tests.tests[ 0 ] );

		return expect( promise ).to.eventually.equal( expected );
	} );

	it( 'should build HTML for a job\'s task', function() {
		var jobId = 'AYIlcxZa1i1nhLox',
			task = _.extend( {
				jobId: jobId,
				snapshot: true,
			}, bender.tests.tests[ 0 ] ),
			expected = '<!DOCTYPE html><html><head></head><body><img src="/jobs/' + jobId +
			'/tests/test/fixtures/tests/_assets/img.jpg"></body></html>',
			promise = bender.template.build( task );

		return expect( promise ).to.eventually.equal( expected );
	} );

	it( 'should build HTML for a job\'s task where no snapshot was taken', function() {
		var jobId = 'ECNtxgcMzm94aQc9',
			task = _.extend( {
				jobId: jobId,
				snapshot: false,
			}, bender.tests.tests[ 0 ] ),
			expected =
			'<!DOCTYPE html><html><head></head><body>' +
			'<img src="/jobs/' + jobId + '/tests/test/fixtures/tests/_assets/img.jpg"></body></html>',
			promise = bender.template.build( task );

		return expect( promise ).to.eventually.equal( expected );
	} );

	it( 'should expose data.files, data.addCSS and data.addJS', function() {
		var testPagebuilder = function( data ) {
			expect( data ).to.have.property( 'files' );
			expect( data.files ).to.have.property( 'css' ).that.deep.equal( [] );
			expect( data.files ).to.have.property( 'js' ).that.deep.equal( [] );

			expect( data ).to.have.property( 'addCSS' ).that.is.a( 'function' );
			expect( data ).to.have.property( 'addJS' ).that.is.a( 'function' );

			// Error without this.
			data.parts.push( '' );

			return when.resolve( data );
		};

		bender.pagebuilders.add( 'testPagebuilder', testPagebuilder );

		var promise = bender.template.build( bender.tests.tests[ 0 ] );

		return promise;
	} );

	it( 'should have data.files.css filled by data.addCSS', function() {
		var testPagebuilder = function( data ) {
			data.addCSS( 'test1.css' );
			data.addCSS( 'test2.css', { body: true } );

			expect( data.files.css ).to.have.length( 2 );

			expect( data.files.css[ 0 ] ).to.deep.equal( {
				url: 'test1.css',
				options: {}
			} );

			expect( data.files.css[ 1 ] ).to.deep.equal( {
				url: 'test2.css',
				options: { body: true }
			} );

			// Error without this.
			data.parts.push( '' );

			return when.resolve( data );
		};

		bender.pagebuilders.add( 'testPagebuilder', testPagebuilder );

		var promise = bender.template.build( bender.tests.tests[ 0 ] );

		return promise;
	} );

	it( 'should have data.files.js filled by data.addJS', function() {
		var testPagebuilder = function( data ) {
			data.addJS( 'test1.js' );
			data.addJS( 'test2.js', { body: true } );

			expect( data.files.js ).to.have.length( 2 );

			expect( data.files.js[ 0 ] ).to.deep.equal( {
				url: 'test1.js',
				options: {}
			} );

			expect( data.files.js[ 1 ] ).to.deep.equal( {
				url: 'test2.js',
				options: { body: true }
			} );

			// Error without this.
			data.parts.push( '' );

			return when.resolve( data );
		};

		bender.pagebuilders.add( 'testPagebuilder', testPagebuilder );

		var promise = bender.template.build( bender.tests.tests[ 0 ] );

		return promise;
	} );
} );
