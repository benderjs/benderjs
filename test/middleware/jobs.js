/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Jobs middleware
 */

/*global describe, it, beforeEach, afterEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	request = require( 'request' ),
	expect = require( 'chai' ).expect,
	request = require( 'request' ),
	rewire = require( 'rewire' ),
	http = require( 'http' ),
	path = require( 'path' ),
	fs = require( 'fs' ),
	jobs = rewire( '../../lib/middlewares/jobs' ),
	serverModule = require( '../../lib/server' ),
	utilsModule = require( '../../lib/utils' );

describe( 'Middleware - Jobs', function() {
	var oldCwd = process.cwd,
		bender,
		instance;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'sockets', 'jobs', 'template' );
		bender.use( [ serverModule, utilsModule ] );
		bender.init();
		bender.middlewares = [ jobs.build ];
		instance = bender.server.create();

		process.cwd = oldCwd;
	} );

	afterEach( function() {
		try {
			instance.close();
		} catch ( e ) {}
	} );

	it( 'should expose build function', function() {
		expect( jobs.build ).to.be.a( 'function' );
	} );

	it( 'should throw 404 on missing job files', function( done ) {
		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/unknown/job/file.js', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 404 );
				expect( body ).to.equal( http.STATUS_CODES[ '404' ] );

				done();
			} );
		} );
	} );

	it( 'should respond to /jobs request with a list of jobs', function( done ) {
		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( JSON.parse( body ) ).to.deep.equal( {
					job: bender.jobs.jobs
				} );

				done();
			} );
		} );
	} );

	it( 'should respond to /jobs/<jobId> request with a job details', function( done ) {
		var id = 'AYIlcxZa1i1nhLox';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + id, function( err, res, body ) {

				expect( res.statusCode ).to.equal( 200 );

				bender.jobs.get( id ).done( function( job ) {
					expect( JSON.parse( body ) ).to.deep.equal( job );

					done();
				} );
			} );
		} );
	} );

	it( 'should respond to /jobs/<jobId>/tests/<testId> with a test page', function( done ) {
		var url = 'AYIlcxZa1i1nhLox/tests/test/fixtures/tests/test/1';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				var templateFile = fs.readFileSync( 'static/default.html' ).toString();

				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( templateFile );

				done();
			} );
		} );
	} );

	it( 'should handle task IDs containing search query', function( done ) {
		var url = 'AYIlcxZa1i1nhLox/tests/test/fixtures/tests/test/1?foo=bar&';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				var templateFile = fs.readFileSync( 'static/default.html' ).toString();

				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( templateFile );

				done();
			} );
		} );
	} );

	it( 'should serve task assets', function( done ) {
		var url = 'AYIlcxZa1i1nhLox/tests/test/fixtures/tests/_assets/asset.js',
			oldCwd = process.cwd,
			cwd = path.resolve( 'test/fixtures/tests/' ),
			file = path.resolve( path.join( 'test/fixtures/tests/', '.bender/jobs/', url ) );

		process.cwd = function() {
			return cwd;
		};

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				var assetFile = fs.readFileSync( file ).toString();

				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( assetFile );

				process.cwd = oldCwd;

				done();
			} );
		} );
	} );

	it( 'should serve task assets for jobs with no snapshot taken', function( done ) {
		var url = 'ECNtxgcMzm94aQc9/tests/test/fixtures/tests/_assets/asset.js',
			file = path.resolve( 'test/fixtures/tests/_assets/asset.js' );

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				var assetFile = fs.readFileSync( file ).toString();

				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( assetFile );

				done();
			} );
		} );
	} );

	it( 'should serve app files from the job\'s snapshot', function( done ) {
		var url = 'AYIlcxZa1i1nhLox/apps/test.js',
			oldCwd = process.cwd,
			cwd = path.resolve( 'test/fixtures/tests/' ),
			file = path.resolve( path.join( 'test/fixtures/tests/', '.bender/jobs/', url ) );

		process.cwd = function() {
			return cwd;
		};

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				var assetFile = fs.readFileSync( file ).toString();

				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( assetFile );

				process.cwd = oldCwd;

				done();
			} );
		} );
	} );

	it( 'should handle /jobs/<jobId>/restart request for an existing job', function( done ) {
		var url = 'AYIlcxZa1i1nhLox/restart';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( JSON.parse( body ) ).to.deep.equal( {
					success: true,
					id: 'AYIlcxZa1i1nhLox'
				} );

				done();
			} );
		} );
	} );

	it( 'should handle /jobs/<jobId>/restart request for a non-existent job', function( done ) {
		var url = 'unknown/restart';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( JSON.parse( body ) ).to.deep.equal( {
					success: false,
					error: 'There are no tasks for this job or a job does not exist.'
				} );

				done();
			} );
		} );
	} );

	it( 'should handle POST:/jobs request to create a new job', function( done ) {
		instance.listen( 1031, function() {
			request.post( 'http://localhost:1031/jobs', function( err, res, body ) {
				var response = JSON.parse( body );

				expect( res.statusCode ).to.equal( 200 );
				expect( response.success ).to.be.true;
				expect( response.id ).to.be.a( 'string' );

				done();
			} ).form( {
				description: 'test description',
				browsers: [ 'chrome', 'firefox' ]
			} );
		} );
	} );

	it( 'should handle DELETE:/jobs/<jobId> request to remove a job', function( done ) {
		instance.listen( 1031, function() {
			request.del( 'http://localhost:1031/jobs/AYIlcxZa1i1nhLox', function( err, res, body ) {
				var response = JSON.parse( body );

				expect( res.statusCode ).to.equal( 200 );
				expect( response.success ).to.be.true;
				expect( response.id ).to.be.a( 'string' );

				done();
			} );
		} );
	} );

	it( 'should handle PUT:/jobs/<jobId> request to edit a job', function( done ) {
		var id = 'AYIlcxZa1i1nhLox';

		instance.listen( 1031, function() {
			request.put( 'http://localhost:1031/jobs/AYIlcxZa1i1nhLox', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );

				bender.jobs.find( id ).done( function( job ) {
					expect( JSON.parse( body ) ).to.deep.equal( job );

					done();
				} );
			} ).form( {
				id: id,
				description: 'new description',
				browsers: [ 'chrome' ]
			} );
		} );
	} );

} );
