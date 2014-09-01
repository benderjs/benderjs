/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Applications module
 */

/*global describe, it, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	sinon = require( 'sinon' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	Collection = require( '../lib/collection' ),
	applications = rewire( '../lib/applications' );

// rewire logger
applications.__set__( 'logger', mocks.logger );

describe( 'Applications', function() {
	var configs = {
			noPath: {
				applications: {
					foo: {
						path: 'invalid/path/',
						files: [
							'bar.js'
						]
					}
				}
			},

			wrongPath: {
				applications: {
					foo: {
						path: 'test/applications.js',
						file: [
							'bar.js'
						]
					}
				}
			},

			brokenPath: {
				applications: {
					foo: {
						path: {},
						files: [
							'bar.js'
						]
					}
				}
			},
		},
		bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'files' );
		bender.use( applications );
	} );

	it( 'should inherit Collection', function() {
		expect( bender.applications ).to.be.instanceof( Collection );
	} );

	it( 'should not build apps from empty config', function() {
		var result;

		bender.applications.build( {} );

		result = bender.applications.get();

		expect( result ).to.be.an( 'array' );
		expect( result ).to.have.length( 0 );
	} );

	it( 'should build applications during bender initialization', function() {
		var result;

		bender.init();

		result = bender.applications.get();

		expect( result ).to.be.an( 'array' );
		expect( result ).to.have.length( 3 );
	} );

	it( 'should use application\'s name as url if no url specified', function() {
		var result;

		bender.applications.build( {
			applications: {
				test: {
					path: 'test/fixtures/apps/',
					files: [ 'test.js' ]
				}
			}
		} );

		result = bender.applications.get();

		expect( result ).to.be.an( 'array' );
		expect( result ).to.have.length( 1 );
		expect( result[ 0 ].url ).to.equal( 'test/' );
	} );

	it( 'should notify that path to an application is invalid', function() {
		var exit = sinon.stub( process, 'exit' );

		exit.throws();

		expect( function() {
			bender.applications.build( configs.noPath );
		} ).to.throw();
		expect( exit.calledWith( 1 ) ).to.be.true;
		expect( exit.calledOnce ).to.be.true;

		expect( function() {
			bender.applications.build( configs.wrongPath );
		} ).to.throw();
		expect( exit.calledWith( 1 ) ).to.be.true;
		expect( exit.calledTwice ).to.be.true;

		expect( function() {
			bender.applications.build( configs.brokenPath );
		} ).to.throw();
		expect( exit.calledWith( 1 ) ).to.be.true;
		expect( exit.calledThrice ).to.be.true;

		process.exit.restore();
	} );
} );
