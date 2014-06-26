/**
 * @file Tests for Jobs module
 */

/*global describe, it, after, beforeEach, afterEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './mocks' ),
	sinon = require( 'sinon' ),
	path = require( 'path' ),
	rimraf = require( 'rimraf' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	util = require( 'util' ),
	call = require( 'when/callbacks' ).call,
	applications = rewire( '../lib/applications' ),
	jobs = rewire( '../lib/jobs' );

jobs.__set__( 'cwd', path.resolve( 'test/fixtures/jobs/' ) );
jobs.__set__( 'log', mocks.logger );
jobs.__set__( 'jobsDir', path.resolve( 'test/fixtures/jobs/store/' ) );

var OldDatastore = jobs.__get__( 'Datastore' );

function Datastore() {
	OldDatastore.call( this, {
		autoload: true
	} );
}

util.inherits( Datastore, OldDatastore );

jobs.__set__( 'Datastore', Datastore );

describe( 'Jobs', function() {
	var job = {
			browsers: [ 'chrome35', 'firefox', '123unknown', 'ie8', 'ie10', 'ie9' ],
			description: 'test job 1',
			filter: [ 'foo' ],
			tests: [
				'tests/test/1', 'tests/test/2', 'tests/test/3'
			]
		},
		job2 = {
			browsers: [ 'firefox' ],
			description: 'test job 2',
			filter: [ 'foo' ],
			tests: [
				'tests/test/1', 'tests/test/2', 'tests/test/3'
			]
		},
		job3 = {
			browsers: [ 'firefox', 'chrome', 'opera', 'ie11' ],
			description: 'test job 3',
			filter: [ 'foo' ],
			tests: [
				'tests/test/1', 'tests/test/2', 'tests/test/3'
			]
		},
		client = {
			id: 12345,
			browser: 'chrome',
			version: 35
		},
		bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'applications', 'tests', 'utils' );
	} );

	afterEach( function() {
		delete bender.jobs;
	} );

	it( 'should attach jobs to bender', function() {
		bender.use( jobs );
		expect( bender.jobs ).to.exist;
	} );

	it( 'should notify user if bender wasn\'t initialized in current directory', function() {
		var exit = sinon.stub( process, 'exit' );

		exit.throws();

		jobs.__set__( 'jobsDir', path.resolve( 'unknown/path/to/jobs/' ) );

		expect( function() {
			bender.use( jobs );
		} ).to.throw();

		jobs.__set__( 'jobsDir', path.resolve( 'test/fixtures/jobs/store/' ) );
		process.exit.restore();
	} );

	it( 'should attach listeners during bender initialization', function() {
		bender.use( jobs );

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
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job );

		return expect( promise ).to.eventually.be.a( 'string' );
	} );

	it( 'should list existing jobs', function() {
		var promise, id;

		bender.use( [ applications, jobs ] );
		bender.init();

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
		bender.use( jobs );

		var promise = bender.jobs.get( 'unknown' );

		return expect( promise ).to.become( null );
	} );

	it( 'should return a job', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.get( id );
			} );

		return promise.then( function( result ) {
			expect( result ).to.be.an( 'object' );
			expect( result ).to.include.keys( [ 'browsers', 'description', 'filter', 'tasks' ] );
		} );
	} );

	it( 'should return a task of a given job', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.getTask( id, job.tests[ 0 ] );
			} );

		return expect( promise ).to.eventually.be.an( 'object' );
	} );

	it( 'should return null for non-existent task of a job', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.getTask( id, 'unknown' );
			} );

		return expect( promise ).to.become( null );
	} );

	it( 'should return an application of a given job', function() {
		var job = {
				browsers: [ 'chrome35', 'firefox', '123unknown' ],
				description: 'test job 3',
				filter: [ 'foo' ],
				tests: [
					'tests/test/1', 'tests/test/2', 'tests/test/3'
				]
			},
			promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.getApp( id, 'test' );
			} );

		return expect( promise ).to.eventually.be.an( 'object' );
	} );

	it( 'should return null for non-existent application of a job', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.getApp( id, 'unknown' );
			} );

		return expect( promise ).to.become( null );
	} );

	it( 'should delete an existing job', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.delete( id );
			} );

		return expect( promise ).to.be.fulfilled;
	} );

	it( 'should return an error when returning non-existent job', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.delete( 'unknown' );

		return expect( promise ).to.be.rejectedWith( 'There\'s no such job.' );
	} );

	it( 'should restart an existing job', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.restart( id );
			} );

		return expect( promise ).to.be.fulfilled;
	} );

	it( 'should return an error when trying to restart non-existent job', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.restart( 'unknown' );

		return expect( promise )
			.to.be.rejectedWith( 'There are no tasks for this job or a job does not exist.' );
	} );

	it( 'should edit existing job', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job )
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
			} );

		return expect( promise ).to.be.fulfilled;
	} );

	it( 'should reject editing non-existent job', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.edit( {
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

	it( 'should reject editing a job if no browsers specified', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.edit( {
			id: 'unknown',
			description: 'new description',
			browsers: []
		} );

		return expect( promise ).to.be.rejectedWith( 'No browsers specified.' );
	} );

	it( 'should not alter job tasks if no change in job\'s browsers list is made while editing', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job2 )
			.then( function( id ) {
				return bender.jobs.edit( {
					id: id,
					description: 'new description',
					browsers: [ {
						name: 'firefox',
						version: 0
					} ]
				} );
			} );

		return expect( promise ).to.be.fulfilled;
	} );

	it( 'should compact results of a given job', function() {
		bender.use( [ applications, jobs ] );

		var job = {
				browsers: [ 'firefox', 'chrome', 'opera', 'ie11' ],
				description: 'test job 3',
				created: 1403699939665,
				filter: [ 'foo' ],
				tasks: [ {
					id: 'tests/test/1',
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
					id: 'tests/test/2',
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
					id: 'tests/test/3',
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

	it( 'should fetch a task for specified client and emit job:run if available', function() {
		var promise;

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job3 )
			.then( function() {
				bender.jobs.fetch( client );
				return call( bender.on.bind( bender ), 'job:run' );
			} );

		return promise.then( function( args ) {
			expect( args[ 0 ] ).to.equal( client.id );
			expect( args[ 1 ] ).to.be.an( 'object' );
			expect( args[ 1 ] ).to.include.keys( [ 'id', 'jobId', 'tbId' ] );
		} );
	} );

	it( 'should complete a fetched task', function() {
		var promise,
			spy = sinon.spy();

		bender.use( [ applications, jobs ] );
		bender.init();

		promise = bender.jobs.create( job3 )
			.then( function() {
				bender.jobs.fetch( client );
				return call( bender.on.bind( bender ), 'job:run' );
			} );

		return promise.then( function( args ) {
			var task = args[ 1 ],
				result = {
					client: args[ 0 ],
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

			call( bender.on.bind( bender ), 'job:update' )
				.then( function( args ) {
					expect( args ).to.equal( task.jobId );
				} );
		} );
	} );

	after( function( done ) {
		rimraf( jobs.__get__( 'jobsDir' ), function() {
			done();
		} );
	} );
} );
