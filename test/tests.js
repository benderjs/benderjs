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
	path = require( 'path' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	sinon = require( 'sinon' ),
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

	it( 'should list tests specified in the configuration file', function() {
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
			script: path.normalize( 'test/fixtures/tests/test2/3.md' ),
			framework: 'test',
			applications: [ 'test' ],
			group: 'Test2'
		}, {
			id: 'test/fixtures/tests/test2/4',
			script: path.normalize( 'test/fixtures/tests/test2/4.md' ),
			framework: 'test',
			applications: [ 'test' ],
			group: 'Test2'
		} ];

		return bender.tests.list()
			.then( function( tests ) {
				expect( tests ).to.deep.equal( expected );
			} );
	} );

	it( 'should list tests using the cache for the second attempt', function() {
		var stub = sinon.stub();

		stub.returnsArg( 0 );

		bender.testbuilders.add( 'stub', stub );

		expect( bender.tests.statsCache ).to.be.empty;

		var tmp;

		return bender.tests.list()
			.then( function( tests ) {
				expect( tests ).to.be.not.empty;

				tmp = tests;

				expect( stub.callCount ).to.equal( 2 );

				return bender.tests.list();
			} )
			.then( function( tests ) {
				expect( tests ).to.deep.equal( tmp );

				expect( stub.callCount ).to.equal( 2 );
			} );
	} );

	it( 'should return a single unit test specified in the configuration file', function() {
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

	it( 'should return a single unit test data from the cache', function() {
		var stub = sinon.stub();

		stub.returnsArg( 0 );

		bender.testbuilders.add( 'stub', stub );

		expect( bender.tests.statsCache ).to.be.empty;

		return bender.tests.get( 'test/fixtures/tests/test/1' )
			.then( function( test ) {
				expect( test ).to.exist;
				expect( bender.tests.statsCache ).to.not.be.empty;
				expect( stub.callCount ).to.equal( 1 );

				return bender.tests.get( 'test/fixtures/tests/test/1' );
			} )
			.then( function( test ) {
				expect( test ).to.exist;
				expect( stub.callCount ).to.equal( 1 );
			} );
	} );

	it( 'should return a single manual test specified in the configuration file', function() {
		return bender.tests.get( 'test/fixtures/tests/test2/4' )
			.then( function( test ) {
				expect( test ).to.be.an( 'object' );
				expect( test.group ).to.equal( 'Test2' );
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

	it( 'should check if a file is located in the tests directory', function() {
		expect( bender.tests.checkPath( 'test/fixtures/tests/test/1.js' ) ).to.be.true;
		expect( bender.tests.checkPath( 'test/fixtures/tests/_assets/file.js' ) ).to.be.true;
		expect( bender.tests.checkPath( 'invalid/test/file.js' ) ).to.be.false;
	} );

	it( 'should return basePaths of a test group', function() {
		var expected = [ 'test/fixtures/tests/test' ],
			expected2 = [ 'test/fixtures/tests/test2' ];

		return bender.tests.getBasePaths( 'Test' )
			.then( function( paths ) {
				expect( paths ).to.deep.equal( expected );

				return bender.tests.getBasePaths( 'Test2' );
			} )
			.then( function( paths ) {
				expect( paths ).to.deep.equal( expected2 );
			} );
	} );

	it( 'should reject with an error when no group found for getBasePaths()', function() {
		var promise = bender.tests.getBasePaths( 'Unknown' );

		return expect( promise ).to.be.rejectedWith( 'There\'s no group: Unknown' );
	} );
} );
