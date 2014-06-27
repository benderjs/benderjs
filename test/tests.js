/**
 * @file Tests for Tests module
 */

/*global describe, it, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './mocks' ),
	_ = require( 'lodash' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	tests = rewire( '../lib/tests' );

describe( 'Tests', function() {
	var bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'testbuilders' );

		bender.use( tests );
	} );

	it( 'should create "tests" namespace in Bender when attached', function() {
		expect( bender.tests ).to.be.an( 'object' );
		expect( bender.tests ).to.include.keys( [ 'list', 'get', 'buildGroup', 'checkPath' ] );
	} );

	it( 'should list tests specified in configuration file', function() {
		return bender.tests.list()
			.then( function( tests ) {
				expect( tests ).to.be.an( 'array' );
				expect( tests ).to.have.length( 6 );
			} );
	} );

	it( 'should return a single test specified in configuration file', function() {
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

	it( 'should resolve without result when trying to get test asset', function() {
		return bender.tests.get( 'test/fixtures/tests/_assets/asset.js' )
			.then( function( test ) {
				expect( test ).to.not.exist;

				return bender.tests.get( 'test/fixtures/tests/test/_assets/asset.js' );
			} )
			.then( function( test ) {
				expect( test ).to.not.exist;
			} );
	} );

	it( 'should resolve without result when trying to get invalid test or asset', function() {
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

	it( 'should use group\'s data taken from cache if no changes in files were made since last check', function() {
		var group = _.merge( {
			assertion: bender.conf.assertion,
			name: 'Test'
		}, bender.conf.tests.Test );

		return bender.tests.buildGroup( group )
			.then( function() {
				return bender.tests.buildGroup( group );
			} )
			.then( function( data ) {
				// returned value should be a reference to cached group
				expect( data ).to.equal( bender.tests.testsCache.Test );
			} );
	} );
} );
