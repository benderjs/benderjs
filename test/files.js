/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Files module
 */

/*global describe, it, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	sinon = require( 'sinon' ),
	expect = require( 'chai' ).expect,
	fs = require( 'when/node' ).liftAll( require( 'graceful-fs' ) ),
	path = require( 'path' ),
	rewire = require( 'rewire' ),
	Store = rewire( '../lib/store' ),
	files = rewire( '../lib/files' );

describe( 'Files', function() {
	var file1 = 'test/fixtures/files/1.js',
		file2 = 'test/fixtures/files/2.js',
		file3 = 'test/fixtures/files/3.js',
		fileUnknown = 'test/fixtures/files/unknown.js',
		patterns = [
			'test/**/*.*',
			'!test/**/test/*.*'
		],
		bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'applications', 'tests', 'utils' );
		bender.use( [ files ] );
	} );

	it( 'should expose bender.files namespace and its API', function() {
		expect( bender.files ).to.exist;
		expect( bender.files ).to.have.keys( [
			'add', 'get', 'find', 'remove', 'update', 'send', 'read', 'readString', 'isValidPath',
			'store', 'File'
		] );
	} );

	it( 'should add a file to the store', function() {
		var file = bender.files.add( file1 );

		expect( file ).to.be.instanceof( bender.files.File );
		expect( Object.keys( bender.files.store ) ).to.have.length( 1 );
	} );

	it( 'should return null if no file found', function() {
		bender.files.add( file1 );
		expect( bender.files.find( file2 ) ).to.be.null;
	} );

	it( 'should find a file in the store', function() {
		var file = bender.files.add( file1 );

		expect( bender.files.find( file1 ) ).to.equal( file );
	} );

	it( 'should get a file from the store', function() {
		var file = bender.files.add( file1 );

		expect( bender.files.get( file1 ) ).to.equal( file );
	} );

	it( 'should add a file to the store if not found while getting it but exists in the FS', function() {
		expect( bender.files.get( file1 ) ).to.be.instanceof( bender.files.File );
	} );

	it( 'should remove a file from the store', function() {
		var f1 = bender.files.add( file1 ),
			f2 = bender.files.add( file2 ),
			f3 = bender.files.add( file3 );

		expect( bender.files.find( file2 ) ).to.equal( f2 );

		bender.files.remove( file2 );

		expect( bender.files.find( file1 ) ).to.equal( f1 );
		expect( bender.files.find( file2 ) ).to.be.null;
		expect( bender.files.find( file3 ) ).to.equal( f3 );
	} );

	it( 'should reset file content on update', function() {
		var file = bender.files.add( file1 );

		return file.read()
			.then( function( content ) {
				expect( content ).to.exist;

				bender.files.update( file1 );

				expect( file.content ).to.not.exist;
			} );
	} );

	it( 'should send a file in the response', function( done ) {
		var file = bender.files.add( file1 ),
			req = mocks.createFakeRequest(),
			res = mocks.createFakeResponse( function( data ) {
				expect( data ).to.equal( file.content );
				done();
			} );

		bender.files.send( file1, req, res );
	} );

	it( 'should override originalPath while sending a file', function( done ) {
		var file = bender.files.add( file1 ),
			req = mocks.createFakeRequest(),
			res = mocks.createFakeResponse( function() {
				expect( file.originalPath ).to.equal( file2 );
				done();
			} );

		expect( file.originalPath ).to.equal( file1 );

		bender.files.send( file1, req, res, file2 );
	} );


	it( 'should reject a promise if no file found to be send', function() {
		var req = mocks.createFakeRequest(),
			res = mocks.createFakeResponse();

		return expect( bender.files.send( fileUnknown, req, res ) ).to.be.rejected;
	} );

	it( 'should check if the given path matches given patterns', function() {
		var f1 = path.resolve( file1 ),
			f2 = path.resolve( 'test/fixtures/files/test/1.js' );

		expect( bender.files.isValidPath( f1, patterns ) ).to.be.true;
		expect( bender.files.isValidPath( f2, patterns ) ).to.be.false;
	} );

	it( 'should read a file', function() {
		return fs.readFile( file1 )
			.then( function( content ) {
				return bender.files.read( file1 )
					.then( function( data ) {
						expect( data.toString() ).to.equal( content.toString() );
					} );
			} );
	} );

	it( 'should read a file as a string', function() {
		return fs.readFile( file1 )
			.then( function( content ) {
				return bender.files.readString( file1 )
					.then( function( data ) {
						expect( data ).to.equal( content.toString() );
					} );
			} );
	} );

	it( 'should reject a promise when file not found', function() {
		var promise = bender.files.read( fileUnknown );

		return expect( promise ).to.be.rejected;
	} );

	describe( 'File', function() {
		it( 'should read its content from the FS and return it', function() {
			var file = bender.files.add( file1 ),
				content;

			return file.read()
				.then( function( result ) {
					content = result.toString();

					return fs.readFile( file1 );
				} )
				.then( function( src ) {
					expect( content ).to.equal( src.toString() );
				} );
		} );

		it( 'should return cached content if not modified', function() {
			var file = bender.files.add( file1 ),
				content;

			return file.read()
				.then( function( result ) {
					content = result.toString();
					return file.read();
				} )
				.then( function( result ) {
					expect( result.toString() ).to.equal( content );
				} );
		} );

		it( 'should check if modified', function() {
			var file = bender.files.add( file1 ),
				newContent = 'var foo = 3;',
				content;

			return file.read()
				.then( function( result ) {
					content = result;

					return file.checkModified();
				} )
				.then( function( result ) {
					expect( result ).to.be.false;

					return fs.writeFile( file1, newContent );
				} )
				.then( function() {
					return file.checkModified();
				} )
				.then( function( result ) {
					expect( result ).to.be.truthy;

					return fs.writeFile( file1, content );
				} );
		} );

		it( 'should return new content if modified', function() {
			var file = bender.files.add( file1 ),
				newContent = 'var foo = 3;',
				content;

			return file.read()
				.then( function( result ) {
					content = result;

					return file.checkModified();
				} )
				.delay( 1000 )
				.then( function( result ) {
					expect( result ).to.be.false;

					return fs.writeFile( file1, newContent );
				} )
				.then( function() {
					return file.checkModified();
				} )
				.then( function( result ) {
					expect( result ).to.be.truthy;

					return file.read();
				} )
				.then( function( result ) {
					expect( result.toString() ).to.equal( newContent );

					return fs.writeFile( file1, content );
				} );
		} );

		it( 'should process itself through defined preprocessors', function() {
			var file = bender.files.add( file1 ),
				spy = sinon.spy();

			bender.preprocessors = new Store();
			bender.preprocessors.add( 'spy', spy );

			return file.process()
				.then( function() {
					expect( spy.calledWith( file ) ).to.be.true;
				} );
		} );

		it( 'should send it\'s contents in the HTTP response', function( done ) {
			var file = bender.files.add( file1 ),
				req = mocks.createFakeRequest(),
				res = mocks.createFakeResponse( function( data ) {
					expect( data ).to.equal( file.content );
					done();
				} );

			file.send( req, res );
		} );

		it( 'should send 304 not modified if no change in the file and proper request headers were sent', function( done ) {
			var file = bender.files.add( file1 ),
				req = mocks.createFakeRequest(),
				res = mocks.createFakeResponse( function() {
					req = mocks.createFakeRequest( {
						'if-modified-since': file.mtime.toUTCString()
					} );

					res = mocks.createFakeResponse( function( data, resp ) {
						expect( resp.status ).to.equal( 304 );
						expect( resp.headers ).to.have.keys( [ 'Cache-Control', 'Date', 'Last-Modified', 'Pragma' ] );
						done();
					} );

					file.send( req, res );
				} );

			file.send( req, res );
		} );

		it( 'should reject a promise if something goes wrong while sending', function() {
			var file = bender.files.add( fileUnknown ),
				spySuccess = sinon.spy(),
				req = mocks.createFakeRequest(),
				res = mocks.createFakeResponse( spySuccess );

			return expect( file.send( req, res ) ).to.be.rejected;
		} );
	} );
} );
