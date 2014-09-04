/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Tests module
 */

/*global describe, it, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's 4s */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	_ = require( 'lodash' ),
	path = require( 'path' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	tests = rewire( '../lib/tests' );

describe( 'Tests', function() {
	var bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'testbuilders' );
		bender.use( tests );
		bender.init();
	} );

	it( 'should create "tests" namespace in Bender when attached', function() {
		expect( bender.tests ).to.be.an( 'object' );
		expect( bender.tests ).to.include.keys( [ 'list', 'get', 'buildGroup', 'checkPath' ] );
	} );

	it( 'should list tests specified in configuration file', function() {
		var expected = [ {
			id: 'test/fixtures/tests/test/1',
			js: path.normalize( 'test/fixtures/tests/test/1.js' ),
			framework: 'test',
			applications: [],
			group: 'Test'
		}, {
			id: 'test/fixtures/tests/test/2',
			js: path.normalize( 'test/fixtures/tests/test/2.js' ),
			framework: 'test',
			applications: [],
			group: 'Test'
		}, {
			id: 'test/fixtures/tests/test/3',
			js: path.normalize( 'test/fixtures/tests/test/3.js' ),
			framework: 'test',
			applications: [],
			group: 'Test'
		}, {
			id: 'test/fixtures/tests/test2/1',
			js: path.normalize( 'test/fixtures/tests/test2/1.js' ),
			framework: 'test',
			applications: [ 'test' ],
			group: 'Test2'
		}, {
			id: 'test/fixtures/tests/test2/2',
			js: path.normalize( 'test/fixtures/tests/test2/2.js' ),
			framework: 'test',
			applications: [ 'test' ],
			group: 'Test2'
		}, {
			id: 'test/fixtures/tests/test2/3',
			js: path.normalize( 'test/fixtures/tests/test2/3.js' ),
			framework: 'test',
			applications: [ 'test' ],
			group: 'Test2'
		} ];

		return bender.tests.list()
			.then( function( tests ) {
				expect( tests ).to.deep.equal( expected );
			} );
	} );

	it( 'should return a single test specified in the configuration file', function() {
		return bender.tests.get( 'test/fixtures/tests/test/1' )
			.then( function( test ) {
				expect( test ).to.be.an( 'object' );
				expect( test.group ).to.equal( 'Test' );

				return bender.tests.get( 'test/fixtures/tests/test2/1' )
					.then( function( test ) {
						expect( test ).to.be.an( 'object' );
						expect( test.group ).to.equal( 'Test2' );
					} );
			} );
	} );

	it( 'should resolve without a result when trying to get a test asset', function() {
		return bender.tests.get( 'test/fixtures/tests/_assets/asset' )
			.then( function( test ) {
				expect( test ).to.not.exist;

				return bender.tests.get( 'test/fixtures/tests/test/_assets/asset' );
			} )
			.then( function( test ) {
				expect( test ).to.not.exist;
			} );
	} );

	it( 'should resolve without a result when trying to get an invalid test or asset', function() {
		return bender.tests.get( 'invalid/test/file.js' )
			.then( function( test ) {
				expect( test ).to.not.exist;
			} );
	} );

	it( 'should check if file is located in tests\' directory', function() {
		expect( bender.tests.checkPath( 'test/fixtures/tests/test/1.js' ) ).to.be.true;
		expect( bender.tests.checkPath( 'test/fixtures/tests/_assets/file.js' ) ).to.be.true;
		expect( bender.tests.checkPath( 'invalid/test/file.js' ) ).to.be.false;
	} );

	it( 'should list all files found in the test groups basePaths', function() {
		return bender.tests.readBasePaths()
			.then( function( files ) {
				expect( files ).to.have.keys( [ 'test/fixtures/tests/' ] );
				expect( files[ 'test/fixtures/tests/' ] ).to.have.length( 21 );

				files[ 'test/fixtures/tests/' ].forEach( function( file ) {
					expect( file ).to.have.keys( [ 'name', 'dir', 'path', 'stats' ] );
				} );
			} );

	} );

	it( 'should use group\'s data taken from cache if no changes in files were made since last check', function() {
		var group = _.merge( {
				framework: bender.conf.framework,
				name: 'Test'
			}, bender.conf.tests.Test ),
			files;

		return bender.tests.readBasePaths()
			.then( function( result ) {
				files = result;

				return bender.tests.buildGroup( group, 'Test', files[ group.basePath ] );
			} )
			.then( function() {
				return bender.tests.buildGroup( group, 'Test', files[ group.basePath ] );
			} )
			.then( function( data ) {
				// returned value should be a reference to cached group
				expect( data ).to.equal( bender.tests.testsCache.Test );
			} );
	} );

	it( 'should use tests\'s data taken from cache if no changes in files were made', function() {
		var group = _.merge( {
				framework: bender.conf.framework,
				name: 'Test'
			}, bender.conf.tests.Test ),
			id = 'test/fixtures/tests/test/1',
			files;

		return bender.tests.readBasePaths()
			.then( function( result ) {
				files = result;

				return bender.tests.buildGroup( group, 'Test', files[ group.basePath ] );
			} )
			.then( function() {
				return bender.tests.get( id );
			} )
			.then( function( data ) {
				var expected = _.find( bender.tests.testsCache.Test, {
					id: id
				} );

				// returned value should be a reference to cached test
				expect( data ).to.equal( expected );
			} );
	} );
} );
