/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
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
	_ = require( 'lodash' ),
	rimraf = require( 'utile' ).rimraf,
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	nodeCall = require( 'when/node' ).call,
	applications = rewire( '../lib/applications' ),
	database = rewire( '../lib/database' ),
	browsers = rewire( '../lib/browsers' ),
	jobs = rewire( '../lib/jobs' );

describe( 'Jobs', function() {
	var job = {
			browsers: [ 'chrome35', 'firefox', '123unknown', 'ie8', 'ie10', 'ie9' ],
			description: 'test job 1',
			filter: [ 'foo' ],
			tests: [ 'test/fixtures/tests/test/1', 'test/fixtures/tests/test/2', 'test/fixtures/tests/test/3' ]
		},
		job_snapshot = {
			browsers: [ 'chrome35', 'firefox', '123unknown', 'ie8', 'ie10', 'ie9' ],
			description: 'test job 1',
			snapshot: true,
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
			browsers: [ 'firefox', 'chrome', 'opera', 'ie11' ],
			description: 'test job 4',
			filter: [ 'foo' ],
			tests: [ 'test/fixtures/tests/test/1' ]
		},
		job5 = {
			browsers: [ 'chrome' ],
			description: 'test job 5',
			filter: [ 'foo' ],
			tests: [ 'test/fixtures/tests/test/1' ]
		},
		job6 = {
			browsers: [ 'chrome', 'firefox' ],
			description: 'test job 6',
			filter: [ 'foo' ],
			tests: [ 'test/fixtures/tests/test/1', 'test/fixtures/tests/test/2' ]
		},
		client = {
			id: 12345,
			browser: 'chrome',
			version: 35,
			mode: 'unit'
		},
		clientManual = {
			id: 12345,
			browser: 'chrome',
			version: 35,
			mode: 'manual'
		},
		chrome = {
			ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36',
			id: 'bdf3ebc3-d783-4ab0-b4d2-aa590d55c533',
			addr: '127.0.0.1:1030'
		},
		bender;

	before( function() {
		jobs.__set__( 'cwd', path.resolve( 'test/fixtures/jobs/' ) );
		jobs.__set__( 'logger', mocks.logger );
		jobs.__set__( 'jobsDir', path.resolve( 'test/fixtures/jobs/store/' ) );
	} );

	after( function( done ) {
		rimraf( jobs.__get__( 'jobsDir' ), function() {
			done();
		} );
	} );

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'applications', 'tests', 'utils', 'files' );
		bender.use( [ applications, database, jobs, browsers ] );
		bender.database.mode = bender.database.MODES.MEMORY;
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

	it( 'should listen to client:afterRegister event', function( done ) {
		bender.on( 'client:getTask', function( data ) {
			expect( data ).to.deep.equal( client );
			done();
		} );

		bender.emit( 'client:afterRegister', client );
	} );

	it( 'should listen to client:complete event', function( done ) {
		bender.emit( 'client:complete', {
			success: true,
			duration: 0,
			results: [],
			client: client,
			jobId: 12345
		} );

		bender.on( 'client:getTask', function( data ) {
			expect( data ).to.deep.equal( client );
			done();
		} );
	} );

	it( 'should create new job', function() {
		return bender.jobs.create( job )
			.then( function( id ) {
				expect( id ).to.be.a( 'string' );

				return nodeCall( bender.jobs.db.jobs.find, {} );
			} )
			.then( function( results ) {
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 1 );
				expect( results[ 0 ] ).to.include.keys(
					[ '_id', 'description', 'browsers', 'filter', 'created' ]
				);

				return nodeCall( bender.jobs.db.tasks.find, {} );
			} )
			.then( function( results ) {
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 3 );

				return nodeCall( bender.jobs.db.browserTasks.find, {} );
			} )
			.then( function( results ) {
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 18 );
			} );
	} );

	it( 'should not create manual tasks for a browser that does not support such', function() {
		var test = _.find( bender.tests.tests, {
			id: 'test/fixtures/tests/test/2'
		} );

		test.manual = true;

		return bender.jobs.create( job6 )
			.then( function( id ) {
				expect( id ).to.be.a( 'string' );

				return nodeCall( bender.jobs.db.jobs.find, {} );
			} )
			.then( function( results ) {
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 1 );
				expect( results[ 0 ] ).to.include.keys(
					[ '_id', 'description', 'browsers', 'filter', 'created' ]
				);

				return nodeCall( bender.jobs.db.tasks.find, {} );
			} )
			.then( function( results ) {
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 2 );

				return nodeCall( bender.jobs.db.browserTasks.find, {} );
			} )
			.then( function( results ) {
				expect( results ).to.be.an( 'array' );
				expect( results ).to.have.length( 3 );

				expect( _.where( results, {
					name: 'firefox'
				} ) ).to.have.length( 1 );

				expect( _.where( results, {
					name: 'chrome'
				} ) ).to.have.length( 2 );
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

	it( 'should sort browsers properly', function() {
		var promise = bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.get( id );
			} );

		return promise.then( function( result ) {
			expect( result.browsers ).to.deep.equal( [
				'123unknown',
				'chrome35',
				'firefox',
				'ie8',
				'ie9',
				'ie10'
			] );
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
		return bender.jobs.create( job_snapshot )
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
				return nodeCall( bender.jobs.db.jobs.find, {
					_id: id
				} );
			} )
			.then( function( results ) {
				expect( results ).to.be.empty;

				return nodeCall( bender.jobs.db.tasks.find, {
					jobId: id
				} );
			} )
			.then( function( results ) {
				expect( results ).to.be.empty;

				return nodeCall( bender.jobs.db.browserTasks.find, {
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
		var store = bender.jobs.db.browserTasks;

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
		var store = bender.jobs.db.browserTasks;

		return bender.jobs.create( job )
			.then( function( id ) {
				return bender.jobs.edit( id, {
					description: 'new description',
					browsers: [ 'chrome', 'firefox' ]
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
		var promise = bender.jobs.edit( 'unknown', {
			description: 'new description',
			browsers: [ 'chrome', 'firefox' ]
		} );

		return expect( promise ).to.be.rejectedWith( 'There\'s no such job' );
	} );

	it( 'should return an error when trying to edit a job and browsers specified', function() {
		var promise = bender.jobs.edit( 'unknown', {
			description: 'new description',
			browsers: []
		} );

		return expect( promise ).to.be.rejectedWith( 'No browsers specified.' );
	} );

	it( 'should not alter job tasks if no change in job\'s browsers list is made while editing', function() {
		var store = bender.jobs.db.browserTasks,
			addSpy = sinon.spy(),
			removeSpy = sinon.spy(),
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

				bender.on( 'tasks:add', addSpy );
				bender.on( 'tasks:remove', removeSpy );

				return bender.jobs.edit( id, {
					description: 'new description',
					browsers: [ 'firefox' ]
				} );
			} )
			.then( function() {
				return nodeCall( store.find, {
					jobId: id
				} );
			} )
			.then( function( results ) {
				expect( results ).to.deep.equal( tasks );
				expect( addSpy.called ).to.be.false;
				expect( removeSpy.called ).to.be.false;
			} );
	} );

	it( 'should update existing job', function() {
		var newDescription = 'new description',
			id;

		return bender.jobs.create( job )
			.then( function( result ) {
				id = result;

				return bender.jobs.update( id, {
					description: newDescription
				} );
			} )
			.then( function() {
				return nodeCall( bender.jobs.db.jobs.findOne, {
					_id: id
				} );
			} )
			.then( function( result ) {
				expect( result.description ).to.equal( newDescription );
			} );
	} );

	it( 'should return an error when trying to update non-existent job', function() {
		var promise = bender.jobs.update( 'unknown', {
			description: 'new description'
		} );

		return expect( promise ).to.be.rejectedWith( 'There\'s no such job' );
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

	it( 'should start a waiting task', function() {
		return bender.jobs.create( job3 )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( task ) {
				expect( task ).to.have.keys( [ 'btId', 'jobId', 'id', 'manual' ] );

				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( task ) {
				expect( task.status ).to.equal( bender.jobs.STATUS.PENDING );
				expect( task.started ).to.be.above( 0 );
			} );
	} );

	it( 'should not start a unit task on a manual client', function() {
		return bender.jobs.create( job3 )
			.then( function() {
				return bender.jobs.startTask( {
					id: 12345,
					browser: 'chrome',
					version: 35,
					mode: 'manual'
				} );
			} )
			.then( function( task ) {
				expect( task ).to.be.null;
			} );
	} );

	it( 'should start a manual task on a manual client', function() {
		var test = _.find( bender.tests.tests, {
			id: 'test/fixtures/tests/test/1'
		} );

		test.manual = true;

		return bender.jobs.create( job5 )
			.then( function() {
				return bender.jobs.startTask( clientManual );
			} )
			.then( function( task ) {
				expect( task ).to.have.keys( [ 'btId', 'jobId', 'id', 'manual' ] );

				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( task ) {
				expect( task.status ).to.equal( bender.jobs.STATUS.PENDING );
				expect( task.started ).to.be.above( 0 );
			} );
	} );

	it( 'should restart a failed task', function() {
		var task;

		return bender.jobs.create( job4 )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( result ) {
				task = result;

				return bender.jobs.completeTask( {
					_id: task.btId,
					btId: task.btId,
					client: client,
					id: task.id,
					jobId: task.jobId,
					success: false,
					results: {
						'test sample': {
							success: false,
							error: 'failure message'
						},
						'test sample 2': {
							success: true,
							error: null
						}
					}
				} );
			} )
			.then( function() {
				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( result ) {
				expect( result.retries ).to.equal( 1 );
				expect( result.status ).to.equal( bender.jobs.STATUS.FAILED );

				return bender.jobs.startTask( client );
			} )
			.then( function( result ) {
				expect( result ).to.deep.equal( task );

				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( task ) {
				expect( task.status ).to.equal( bender.jobs.STATUS.PENDING );
				expect( task.started ).to.be.above( 0 );
			} );
	} );

	it( 'should not restart a failed task if retries count exceeded', function() {
		var task;

		bender.conf.testRetries = 0;

		return bender.jobs.create( job4 )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( result ) {
				task = result;

				return bender.jobs.completeTask( {
					_id: task.btId,
					btId: task.btId,
					client: client,
					id: task.id,
					jobId: task.jobId,
					success: false,
					results: {
						'test sample': {
							success: false,
							error: 'failure message'
						},
						'test sample 2': {
							success: true,
							error: null
						}
					}
				} );
			} )
			.then( function() {
				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( result ) {
				expect( result.retries ).to.equal( 1 );
				expect( result.status ).to.equal( bender.jobs.STATUS.FAILED );

				return bender.jobs.startTask( client );
			} )
			.then( function( result ) {
				expect( result ).to.not.exist;

				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( result ) {
				expect( result.status ).to.equal( bender.jobs.STATUS.FAILED );
			} );
	} );

	it( 'should not restart a failed manual task', function() {
		var test = _.find( bender.tests.tests, {
			id: 'test/fixtures/tests/test/1'
		} );

		test.manual = true;

		var task;

		bender.conf.testRetries = 1;

		return bender.jobs.create( job5 )
			.then( function() {
				return bender.jobs.startTask( clientManual );
			} )
			.then( function( result ) {
				task = result;

				return bender.jobs.completeTask( {
					_id: task.btId,
					btId: task.btId,
					client: client,
					id: task.id,
					jobId: task.jobId,
					success: false,
					manual: true,
					results: {
						'test sample': {
							success: false,
							error: 'failure message'
						},
						'test sample 2': {
							success: true,
							error: null
						}
					}
				} );
			} )
			.then( function() {
				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( result ) {
				expect( result.retries ).to.equal( 2 );
				expect( result.status ).to.equal( bender.jobs.STATUS.FAILED );

				return bender.jobs.startTask( client );
			} )
			.then( function( result ) {
				expect( result ).to.not.exist;

				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( result ) {
				expect( result.status ).to.equal( bender.jobs.STATUS.FAILED );
			} );
	} );

	it( 'should restart a timed-out task', function() {
		return bender.jobs.create( job4 )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( task ) {
				return nodeCall( bender.jobs.db.browserTasks.update, {
					_id: task.btId
				}, {
					$set: {
						started: 0
					}
				} );
			} )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( task ) {
				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( task ) {
				expect( task.status ).to.equal( bender.jobs.STATUS.PENDING );
				expect( task.retries ).to.equal( 1 );
			} );
	} );

	it( 'should timed-out task as failad after exceeding retry count', function() {
		var task;

		bender.conf.testRetries = 0;

		return bender.jobs.create( job4 )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( result ) {
				task = result;

				return nodeCall( bender.jobs.db.browserTasks.update, {
					_id: task.btId
				}, {
					$set: {
						started: 0,
						retries: 1
					}
				} );
			} )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( result ) {
				expect( result ).to.not.exist;

				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( task ) {
				expect( task.status ).to.equal( bender.jobs.STATUS.FAILED );
				expect( task.errors[ 0 ] ).to.deep.equal( {
					name: 'Test timeout',
					error: 'Test couldn\'t be executed after maximum number of retries'
				} );
			} );
	} );

	it( 'should complete a successful task', function( done ) {
		var task;

		bender.jobs.create( job3 )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( data ) {
				task = data;

				var result = {
					_id: task.btId,
					btId: task.btId,
					client: client,
					id: task.id,
					jobId: task.jobId,
					duration: 100,
					success: true,
					results: {
						'test sample': {
							success: true,
							error: null
						},
						'test sample 2': {
							success: true,
							error: null
						}
					}
				};

				bender.on( 'job:update', function( id ) {
					expect( id ).to.equal( task.jobId );
					done();
				} );

				return bender.jobs.completeTask( result );
			} )
			.then( function() {
				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( result ) {
				expect( result.status ).to.equal( bender.jobs.STATUS.PASSED );
			} );
	} );

	it( 'should complete a failed task', function( done ) {
		var task;

		bender.jobs.create( job3 )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( data ) {
				task = data;

				var result = {
					_id: task.btId,
					btId: task.btId,
					client: client,
					id: task.id,
					jobId: task.jobId,
					duration: 100,
					success: false,
					results: {
						'test sample': {
							success: false,
							error: 'failure message'
						},
						'test sample 2': {
							success: true,
							error: null
						}
					}
				};

				bender.on( 'job:update', function( id ) {
					expect( id ).to.equal( task.jobId );
					done();
				} );

				return bender.jobs.completeTask( result );
			} )
			.then( function() {
				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( result ) {
				expect( result.status ).to.equal( bender.jobs.STATUS.FAILED );
			} );
	} );

	it( 'should complete an ignored task', function( done ) {
		var task;

		bender.jobs.create( job3 )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( data ) {
				task = data;

				var result = {
					_id: task.btId,
					btId: task.btId,
					client: client,
					id: task.id,
					jobId: task.jobId,
					success: true,
					ignored: true,
					results: {}
				};

				bender.on( 'job:update', function( id ) {
					expect( id ).to.equal( task.jobId );
					done();
				} );

				return bender.jobs.completeTask( result );
			} )
			.then( function() {
				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( result ) {
				expect( result.status ).to.equal( bender.jobs.STATUS.IGNORED );
			} );
	} );

	it( 'should notify the job is complete', function( done ) {
		var task;

		bender.jobs.create( job5 )
			.then( function() {
				return bender.jobs.startTask( client );
			} )
			.then( function( data ) {
				task = data;

				var result = {
					_id: task.btId,
					btId: task.btId,
					client: client,
					id: task.id,
					jobId: task.jobId,
					duration: 100,
					success: true,
					results: {
						'test sample': {
							success: true,
							error: null
						},
						'test sample 2': {
							success: true,
							error: null
						}
					}
				};

				bender.on( 'job:complete', function( job ) {
					expect( job._id ).to.equal( task.jobId );
					done();
				} );

				return bender.jobs.completeTask( result );
			} )
			.then( function() {
				return nodeCall( bender.jobs.db.browserTasks.findOne, {
					_id: task.btId
				} );
			} )
			.then( function( result ) {
				expect( result.status ).to.equal( bender.jobs.STATUS.PASSED );
			} );
	} );

	it( 'should start a task on a client when a job is created', function( done ) {
		bender.browsers.addClient( chrome );

		bender.on( 'client:getTask', function handle( client, next ) {
			expect( client ).to.have.keys( [ 'ua', 'browser', 'version', 'addr', 'id', 'ready', 'mode' ] );
			expect( next ).to.be.a( 'function' );
			done();
		} );
		bender.jobs.create( job5 );
	} );

	it( 'should not a start task on a busy client', function( done ) {
		bender.on( 'client:afterRegister', function( client ) {
			var spy = sinon.spy();

			bender.browsers.setClientReady( client.id, false );

			bender.on( 'client:getTask', spy );

			bender.jobs.create( job5 );

			expect( spy.called ).to.be.false;

			done();
		} );

		bender.browsers.addClient( chrome );
	} );
} );
