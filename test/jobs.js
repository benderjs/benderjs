/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Jobs module
 */

/*global describe, it, before, after, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	sinon = require( 'sinon' ),
	path = require( 'path' ),
	rimraf = require( 'rimraf' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	util = require( 'util' ),
	call = require( 'when/callbacks' ).call,
	nodeCall = require( 'when/node' ).call,
	applications = rewire( '../lib/applications' ),
	jobs = rewire( '../lib/jobs' ),
	datastores = {};

describe( 'Jobs', function() {
	var job = {
			browsers: [ 'chrome35', 'firefox', '123unknown', 'ie8', 'ie10', 'ie9' ],
			description: 'test job 1',
			filter: [ 'foo' ],
			tests: [ 'test/fixtures/tests/test/1', 'test/fixtures/tests/test/2', 'test/fixtures/tests/test/3' ]
		},
		job2 = {
			browsers: [ 'firefox' ],
			description: 'test job 2',
			filter: [ 'foo' ],
			tests: [ 'test/fixtures/tests/test/1', 'test/fixtures/tests/test/2', 'test/fixtures/tests/test/3' ]
		},
		job3 = {
			browsers: [ 'firefox', 'chrome', 'opera', 'ie11' ],
			description: 'test job 3',
			filter: [ 'foo' ],
			tests: [ 'test/fixtures/tests/test/1', 'test/fixtures/tests/test/2', 'test/fixtures/tests/test/3' ]
		},
		job4 = {
			browsers: [ 'chrome' ],
			description: 'test job 4',
			filter: [ 'foo' ],
			tests: [ 'test/fixtures/tests/test/1' ]
		},
		client = {
			id: 12345,
			browser: 'chrome',
			version: 35
		},
		OldDatastore,
		bender;

	before( function() {
		jobs.__set__( 'cwd', path.resolve( 'test/fixtures/jobs/' ) );
		jobs.__set__( 'logger', mocks.logger );
		jobs.__set__( 'jobsDir', path.resolve( 'test/fixtures/jobs/store/' ) );

		OldDatastore = jobs.__get__( 'Datastore' );

		function Datastore( options ) {
			// keep a reference to the datastore
			datastores[ options.filename.split( path.sep ).pop() ] = this;

			OldDatastore.call( this, {
				autoload: true
			} );
		}

		util.inherits( Datastore, OldDatastore );

		jobs.__set__( 'Datastore', Datastore );
	} );

	after( function( done ) {
		datastores = null;
		jobs.__set__( 'Datastore', OldDatastore );

		rimraf( jobs.__get__( 'jobsDir' ), function() {
			done();
		} );
	} );

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'applications', 'tests', 'utils' );
		bender.use( [ applications, jobs ] );
		bender.init();
	} );

	it( 'should attach jobs to bender', function() {
		bender.use( jobs );
		expect( bender.jobs ).to.exist;
	} );

	it( 'should notify user if bender wasn\'t initialized in current directory', function() {
		var exit = sinon.stub( process, 'exit' );

		function Notification() {}

		exit.throws( Notification );

		jobs.__set__( 'jobsDir', path.resolve( 'unknown/path/to/jobs/' ) );

		expect( function() {
			bender.use( jobs );
		} ).to.throw( 'Notification' );

		jobs.__set__( 'jobsDir', path.resolve( 'test/fixtures/jobs/store/' ) );
		process.exit.restore();
	} );

	it( 'should attach listeners during bender initialization', function() {
		sinon.spy( bender.jobs, 'fetch' ),
		sinon.spy( bender.jobs, 'completeTask' );

		bender.init();

		bender.emit( 'client:fetch', client );

		expect( bender.jobs.fetch.calledOnce ).to.be.true;
		bender.jobs.fetch.restore();

		bender.emit( 'client:complete', {
			success: true,
			duration: 0,
			results: [],
			client: client,
			jobId: 12345
		} );

		expect( bender.jobs.completeTask.calledOnce ).to.be.true;
		bender.jobs.completeTask.restore();
	} );

	it( 'should create new job', function() {
		return bender.jobs.create( job )
			.then( function( id ) {
				expect( id ).to.be.a( 'string' );

				return nodeCall( datastores[ 'jobs.db' ].find, {} );
			} )
			.then( function( results ) {
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 1 );
				expect( results[ 0 ] ).to.include.keys(
					[ '_id', 'description', 'browsers', 'filter', 'created' ]
				);

				return nodeCall( datastores[ 'tasks.db' ].find, {} );
			} )
			.then( function( results ) {
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 3 );

				return nodeCall( datastores[ 'browser_tasks.db' ].find, {} );
			} )
			.then( function( results ) {
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 18 );
			} );
	} );

	it( 'should list existing jobs', function() {
		var promise, id;

		promise = bender.jobs.create( job )
			.then( function( result ) {
				id = result;
				return bender.jobs.list();
			} )
			.then( function( results ) {
				return results.some( function( job ) {
					return job.id === id;
				} );
			} );

		return expect( promise ).to.become( true );
	} );

	it( 'should return null for non-existent job', function() {
		var promise = bender.jobs.get( 'unknown' );

		return expect( promise ).to.become( null );
	} );

	it( 'should return a job', function() {
		var promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.get( id );
			} );

		return promise.then( function( result ) {
			expect( result ).to.be.an( 'object' );
			expect( result ).to.include.keys( [ 'browsers', 'description', 'filter', 'tasks' ] );
			expect( result.filter ).to.deep.equal( job.filter );
			expect( result.description ).to.deep.equal( job.description );
			expect( result.browsers.length ).to.equal( job.browsers.length );
		} );
	} );

	it( 'should return a task from a given job', function() {
		return bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.getTask( id, job.tests[ 0 ] );
			} )
			.then( function( result ) {
				expect( result ).to.be.an( 'object' );
				expect( result.id ).to.equal( job.tests[ 0 ] );
			} );
	} );

	it( 'should return null for non-existent task of a job', function() {
		var promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.getTask( id, 'unknown' );
			} );

		return expect( promise ).to.become( null );
	} );

	it( 'should return an application of a given job', function() {
		return bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.getApp( id, 'test' );
			} )
			.then( function( result ) {
				var app = bender.applications.get( 'test' );

				expect( result ).to.be.an( 'object' );
				expect( result.name ).to.equal( app.name );
				expect( result.path ).to.equal( app.path );
				expect( result.url ).to.equal( app.url );
				expect( result.js ).to.deep.equal( app.js );
				expect( result.css ).to.deep.equal( app.css );
			} );
	} );

	it( 'should return null for non-existent application of a job', function() {
		var promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.getApp( id, 'unknown' );
			} );

		return expect( promise ).to.become( null );
	} );

	it( 'should delete an existing job', function() {
		var id;

		return bender.jobs.create( job )
			.then( function( result ) {
				id = result;

				return bender.jobs.delete( id );
			} )
			.then( function() {
				return nodeCall( datastores[ 'jobs.db' ].find, {
					_id: id
				} );
			} )
			.then( function( results ) {
				expect( results ).to.be.empty;

				return nodeCall( datastores[ 'tasks.db' ].find, {
					jobId: id
				} );
			} )
			.then( function( results ) {
				expect( results ).to.be.empty;

				return nodeCall( datastores[ 'browser_tasks.db' ].find, {
					jobId: id
				} );
			} )
			.then( function( results ) {
				expect( results ).to.be.empty;
			} );
	} );

	it( 'should return an error when trying to remove non-existent job', function() {
		var promise = bender.jobs.delete( 'unknown' );

		return expect( promise ).to.be.rejectedWith( 'There\'s no such job.' );
	} );

	it( 'should restart an existing job', function() {
		var store = datastores[ 'browser_tasks.db' ];

		return bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.restart( id )
					.then( function() {
						return id;
					} );
			} )
			.then( function( id ) {
				return nodeCall( store.find, {
					jobId: id
				} );
			} )
			.then( function( results ) {
				results.forEach( function( result ) {
					expect( result.status ).to.equal( 0 );
					expect( result.retries ).to.equal( 0 );
					expect( result.errors ).to.equal( null );
					expect( result.started ).to.equal( 0 );
					expect( result.duration ).to.equal( 0 );
					expect( result.total ).to.equal( 0 );
					expect( result.testedVersion ).to.equal( 0 );
					expect( result.testedUA ).to.equal( null );
				} );
			} );
	} );

	it( 'should return an error when trying to restart non-existent job', function() {
		var promise = bender.jobs.restart( 'unknown' );

		return expect( promise )
			.to.be.rejectedWith( 'There are no tasks for this job or a job does not exist.' );
	} );

	it( 'should edit existing job', function() {
		var store = datastores[ 'browser_tasks.db' ];

		return bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.edit( {
					id: id,
					description: 'new description',
					browsers: [ {
						name: 'chrome',
						version: 0
					}, {
						name: 'firefox',
						version: 0
					} ]
				} );
			} )
			.then( function( result ) {
				return nodeCall( store.find, {
					jobId: result.id
				} );
			} )
			.then( function( tasks ) {
				tasks.forEach( function( task ) {
					expect( task ).to.contain.keys(
						[ 'name', 'version', 'taskId', 'taskName', 'jobId', 'status', 'retries', 'created', '_id' ]
					);
				} );
			} );
	} );

	it( 'should return an error when trying to edit non-existent job', function() {
		var promise = bender.jobs.edit( {
			id: 'unknown',
			description: 'new description',
			browsers: [ {
				name: 'chrome',
				version: 0
			}, {
				name: 'firefox',
				version: 0
			} ]
		} );

		return expect( promise ).to.be.rejectedWith( 'There\'s no such job' );
	} );

	it( 'should return an error when trying to edit a job and browsers specified', function() {
		var promise = bender.jobs.edit( {
			id: 'unknown',
			description: 'new description',
			browsers: []
		} );

		return expect( promise ).to.be.rejectedWith( 'No browsers specified.' );
	} );

	it( 'should not alter job tasks if no change in job\'s browsers list is made while editing', function() {
		var store = datastores[ 'browser_tasks.db' ],
			tasks,
			id;

		return bender.jobs.create( job2 )
			.then( function( result ) {
				id = result;

				return nodeCall( store.find, {
					jobId: id
				} );
			} )
			.then( function( results ) {
				tasks = results;

				return bender.jobs.edit( {
					id: id,
					description: 'new description',
					browsers: [ {
						name: 'firefox',
						version: 0
					} ]
				} );
			} )
			.then( function() {
				return nodeCall( store.find, {
					jobId: id
				} );
			} )
			.then( function( results ) {
				expect( results ).to.deep.equal( tasks );
			} );
	} );

	it( 'should compact results of a given job', function() {
		var job = {
				browsers: [ 'firefox', 'chrome', 'opera', 'ie11' ],
				description: 'test job 3',
				created: 1403699939665,
				filter: [ 'foo' ],
				tasks: [ {
					id: 'test/fixtures/tests/test/1',
					_id: 'ECNtxgcMzm94aQc9',
					jobId: 'AYIlcxZa1i1nhLox',
					results: [ {
						name: 'chrome',
						version: 0,
						jobId: 'AYIlcxZa1i1nhLox',
						status: 0,
						retries: 0
					}, {
						name: 'firefox',
						version: 0,
						jobId: 'AYIlcxZa1i1nhLox',
						status: bender.jobs.STATUS.PENDING,
						retries: 0,
						testedVersion: 30
					}, {
						name: 'ie',
						version: '11',
						jobId: 'AYIlcxZa1i1nhLox',
						status: bender.jobs.STATUS.FAILED,
						retries: 0,
						duration: 0,
						testedVersion: 11
					}, {
						name: 'opera',
						version: 0,
						jobId: 'AYIlcxZa1i1nhLox',
						status: bender.jobs.STATUS.PASSED,
						retries: 0,
						duration: 0,
						testedVersion: 16
					} ]
				}, {
					id: 'test/fixtures/tests/test/2',
					_id: 'qxXbaXERyznmKIhz',
					jobId: 'AYIlcxZa1i1nhLox',
					results: [ {
						name: 'chrome',
						version: 0,
						jobId: 'AYIlcxZa1i1nhLox',
						status: 0,
						retries: 0
					}, {
						name: 'firefox',
						version: 0,
						jobId: 'AYIlcxZa1i1nhLox',
						status: 0,
						retries: 0,
						duration: 0
					}, {
						name: 'ie',
						version: '11',
						jobId: 'AYIlcxZa1i1nhLox',
						status: bender.jobs.STATUS.PASSED,
						retries: 0,
						duration: 0,
						testedVersion: 11
					}, {
						name: 'opera',
						version: 0,
						jobId: 'AYIlcxZa1i1nhLox',
						status: bender.jobs.STATUS.PASSED,
						retries: 0,
						duration: 0,
						testedVersion: 16
					} ]
				}, {
					id: 'test/fixtures/tests/test/3',
					_id: 'oTNMAwH5EHFNr3lc',
					jobId: 'AYIlcxZa1i1nhLox',
					results: [ {
						name: 'chrome',
						version: 0,
						jobId: 'AYIlcxZa1i1nhLox',
						status: 0,
						retries: 0
					}, {
						name: 'firefox',
						version: 0,
						jobId: 'AYIlcxZa1i1nhLox',
						status: 0,
						retries: 0,
						duration: 0
					}, {
						name: 'ie',
						version: '11',
						jobId: 'AYIlcxZa1i1nhLox',
						status: bender.jobs.STATUS.PASSED,
						retries: 0,
						duration: 0,
						testedVersion: 11
					}, {
						name: 'opera',
						version: 0,
						jobId: 'AYIlcxZa1i1nhLox',
						status: bender.jobs.STATUS.PASSED,
						retries: 0,
						duration: 0,
						testedVersion: 16
					} ]
				} ],
				id: 'AYIlcxZa1i1nhLox'
			},
			results = bender.jobs.compactResults( job ).results;

		expect( results[ 0 ].status ).to.equal( bender.jobs.STATUS.WAITING );
		expect( results[ 1 ].status ).to.equal( bender.jobs.STATUS.PENDING );
		expect( results[ 2 ].status ).to.equal( bender.jobs.STATUS.FAILED );
		expect( results[ 3 ].status ).to.equal( bender.jobs.STATUS.PASSED );
	} );

	it( 'should fetch a waiting task for specified client', function( done ) {
		bender.jobs.create( job3 ).done( function() {
			bender.jobs.fetch( client, function callback( data ) {
				expect( data ).to.be.an( 'object' );
				expect( data ).to.include.keys( [ 'id', 'jobId', 'tbId' ] );

				done();
			} );
		} );
	} );

	it( 'should fetch a pending, but timed out task and increase it\'s retry counter', function( done ) {
		var store = datastores[ 'browser_tasks.db' ],
			lastStart = new Date() - ( bender.conf.testTimeout + 1000 );

		function callback( args ) {
			expect( args ).to.be.an( 'object' );

			return nodeCall( store.findOne, {
				taskName: job4.tests[ 0 ]
			} ).then( function( task ) {
				expect( task.retries ).to.equal( 1 );
				expect( task.started ).to.not.equal( lastStart );
				done();
			} );
		}


		bender.jobs.create( job4 )
			.then( function() {
				return nodeCall( store.update, {
					taskName: job4.tests[ 0 ]
				}, {
					$set: {
						status: bender.jobs.STATUS.PENDING,
						// set earlier date to make it timed out
						started: lastStart
					}
				} );
			} )
			.then( function() {
				bender.jobs.fetch( client, callback );
			} );
	} );

	it( 'should mark a task with exceeded retry limit as failed', function( done ) {
		var store = datastores[ 'browser_tasks.db' ];

		function callback( args ) {
			expect( args ).to.not.exist;

			return nodeCall( store.findOne, {
				taskName: job4.tests[ 0 ]
			} ).done( function( task ) {
				expect( task.status ).to.equal( bender.jobs.STATUS.FAILED );
				done();
			} );
		}

		bender.jobs.create( job4 )
			.then( function() {
				return nodeCall( store.update, {
					taskName: job4.tests[ 0 ]
				}, {
					$set: {
						status: bender.jobs.STATUS.PENDING,
						// set higher than the limit retry count
						retries: bender.conf.testRetries + 1,
						started: new Date() - ( bender.conf.testTimeout + 1000 )
					}
				} );
			} )
			.then( function() {
				bender.jobs.fetch( client, callback );
			} );
	} );

	it( 'should complete a failed task', function() {
		return bender.jobs.create( job3 )
			.then( function() {
				return call( bender.jobs.fetch, client );
			} )
			.then( function( task ) {
				var result = {
					client: client,
					id: task.id,
					tbId: task.tbId,
					jobId: task.jobId,
					success: false,
					results: {
						'test sample': {
							success: false,
							error: 'sample error'
						},
						'test sample 2': {
							success: true,
							error: null
						}
					}
				};

				bender.jobs.completeTask( result );

				return call( bender.on.bind( bender ), 'job:update' )
					.then( function( args ) {
						expect( args ).to.equal( task.jobId );
					} );
			} );
	} );

	it( 'should complete an ignored task', function() {
		return bender.jobs.create( job4 )
			.then( function() {
				return call( bender.jobs.fetch, client );
			} )
			.then( function( task ) {
				var result = {
					client: client,
					id: task.id,
					tbId: task.tbId,
					jobId: task.jobId,
					success: true,
					ignored: true,
					results: {}
				};

				bender.jobs.completeTask( result );

				return call( bender.on.bind( bender ), 'job:update' );
			} )
			.then( function() {
				return nodeCall( datastores[ 'browser_tasks.db' ].findOne, {
					taskName: job4.tests[ 0 ]
				} );
			} )
			.then( function( task ) {
				expect( task.status ).to.equal( bender.jobs.STATUS.IGNORED );
			} );
	} );
} );
