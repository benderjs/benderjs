/**
 * @file Tests for Jobs middleware
 */

/*global describe, it, beforeEach */
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
	jobs = rewire( '../../lib/middleware/jobs' ),
	serverModule = require( '../../lib/server' ),
	utilsModule = require( '../../lib/utils' );

describe( 'Middleware - Jobs', function() {
	var bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils', 'sockets', 'jobs', 'template' );
		bender.use( [ serverModule, utilsModule ] );
		bender.init();
		bender.middleware = [ jobs.create ];
	} );

	it( 'should expose create function', function() {
		expect( jobs.create ).to.be.a( 'function' );
	} );

	it( 'should throw 404 on missing job files', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/unknown/job/file.js', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 404 );
				expect( body ).to.equal( http.STATUS_CODES[ '404' ] );
				instance.close();
				done();
			} );
		} );
	} );

	it( 'should respond to /jobs request with a list of jobs', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( JSON.parse( body ) ).to.deep.equal( {
					job: bender.jobs.jobs
				} );

				instance.close();
				done();
			} );
		} );
	} );

	it( 'should respond to /jobs/<jobId> request with a job details', function( done ) {
		var instance = bender.server.create(),
			id = 'AYIlcxZa1i1nhLox';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + id, function( err, res, body ) {

				expect( res.statusCode ).to.equal( 200 );

				bender.jobs.get( id ).done( function( job ) {
					expect( JSON.parse( body ) ).to.deep.equal( job );
					instance.close();
					done();
				} );
			} );
		} );
	} );

	it( 'should respond to /jobs/<jobId>/tests/<testId> with a test page', function( done ) {
		var instance = bender.server.create(),
			url = 'AYIlcxZa1i1nhLox/tests/test/fixtures/tests/test/1';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				var templateFile = fs.readFileSync( 'static/default.html' ).toString();

				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( templateFile );
				instance.close();
				done();
			} );
		} );
	} );

	it( 'should handle task IDs containing search query', function( done ) {
		var instance = bender.server.create(),
			url = 'AYIlcxZa1i1nhLox/tests/test/fixtures/tests/test/1?foo=bar&';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				var templateFile = fs.readFileSync( 'static/default.html' ).toString();

				expect( res.statusCode ).to.equal( 200 );
				expect( body ).to.equal( templateFile );
				instance.close();
				done();
			} );
		} );
	} );

	it( 'should serve task assets', function( done ) {
		var instance = bender.server.create(),
			url = 'AYIlcxZa1i1nhLox/tests/test/fixtures/tests/_assets/asset.js',
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

				instance.close();
				process.cwd = oldCwd;
				done();
			} );
		} );
	} );

	it( 'should serve app files from the job\'s snapshot', function( done ) {
		var instance = bender.server.create(),
			url = 'AYIlcxZa1i1nhLox/apps/test.js',
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

				instance.close();
				process.cwd = oldCwd;
				done();
			} );
		} );
	} );

	it( 'should handle /jobs/<jobId>/restart request for an existing job', function( done ) {
		var instance = bender.server.create(),
			url = 'AYIlcxZa1i1nhLox/restart';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( JSON.parse( body ) ).to.deep.equal( {
					success: true,
					id: 'AYIlcxZa1i1nhLox'
				} );

				instance.close();
				done();
			} );
		} );
	} );

	it( 'should handle /jobs/<jobId>/restart request for a non-existent job', function( done ) {
		var instance = bender.server.create(),
			url = 'unknown/restart';

		instance.listen( 1031, function() {
			request.get( 'http://localhost:1031/jobs/' + url, function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );
				expect( JSON.parse( body ) ).to.deep.equal( {
					success: false,
					error: 'There are no tasks for this job or a job does not exist.'
				} );

				instance.close();
				done();
			} );
		} );
	} );

	it( 'should handle POST:/jobs request to create a new job', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.post( 'http://localhost:1031/jobs', function( err, res, body ) {
				var response = JSON.parse( body );

				expect( res.statusCode ).to.equal( 200 );
				expect( response.success ).to.be.true;
				expect( response.id ).to.be.a( 'string' );

				instance.close();
				done();
			} ).form( {
				description: 'test description',
				browsers: [ 'chrome', 'firefox' ]
			} );
		} );
	} );

	it( 'should handle DELETE:/jobs/<jobId> request to remove a job', function( done ) {
		var instance = bender.server.create();

		instance.listen( 1031, function() {
			request.del( 'http://localhost:1031/jobs/AYIlcxZa1i1nhLox', function( err, res, body ) {
				var response = JSON.parse( body );

				expect( res.statusCode ).to.equal( 200 );
				expect( response.success ).to.be.true;
				expect( response.id ).to.be.a( 'string' );

				instance.close();
				done();
			} );
		} );
	} );

	it( 'should handle PUT:/jobs/<jobId> request to edit a job', function( done ) {
		var instance = bender.server.create(),
			id = 'AYIlcxZa1i1nhLox';

		instance.listen( 1031, function() {
			request.put( 'http://localhost:1031/jobs/AYIlcxZa1i1nhLox', function( err, res, body ) {
				expect( res.statusCode ).to.equal( 200 );

				bender.jobs.find( id ).done( function( job ) {
					expect( JSON.parse( body ) ).to.deep.equal( job );

					instance.close();
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
