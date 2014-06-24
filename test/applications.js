/**
 * @file Tests for Applications module
 */

/*global describe, it */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './mocks' ),
	sinon = require( 'sinon' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	Collection = require( '../lib/collection' ),
	applications = rewire( '../lib/applications' );

// rewire logger
applications.__set__( 'logger', mocks.logger );

describe( 'Applications', function() {
	var bender = mocks.getBender( 'conf', 'utils' ),
		configs = {
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
		};

	bender.use( applications );

	it( 'should inherit Collection', function() {
		expect( bender.applications ).to.be.instanceof( Collection );
	} );

	it( 'should not build apps from empty config', function() {
		var result;

		bender.applications.build( {} );

		result = bender.applications.get();

		expect( result ).to.be.instanceof( Array );
		expect( result ).to.have.length( 0 );
	} );

	it( 'should build applications during bender initialization', function() {
		var result;

		bender.init();

		result = bender.applications.get();

		expect( result ).to.be.instanceof( Array );
		expect( result ).to.have.length( 2 );
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
