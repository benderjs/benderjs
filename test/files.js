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
	fs = require( 'when/node' ).liftAll( require( 'fs' ) ),
	path = require( 'path' ),
	rewire = require( 'rewire' ),
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
			'add', 'get', 'find', 'remove', 'update', 'send', 'isValidPath',
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

		return bender.files.get( file1 )
			.then( function( result ) {
				expect( result ).to.equal( file );
			} );
	} );

	it( 'should add a file to the store if not found while getting it but exists in the FS', function() {
		return bender.files.get( file1 )
			.then( function( file ) {
				expect( file ).to.be.instanceof( bender.files.File );
			} );
	} );

	it( 'should return null if file not found while getting from the store and does not exist in the FS', function() {
		return bender.files.get( fileUnknown )
			.then( function( result ) {
				expect( result ).to.be.null;
			} );
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
			resp = mocks.createFakeResponse( function( data ) {
				expect( data ).to.equal( file.content );
				done();
			} );

		bender.files.send( file1, resp );
	} );

	it( 'should override oldPath while sending a file', function( done ) {
		var file = bender.files.add( file1 ),
			resp = mocks.createFakeResponse( function() {
				expect( file.oldPath ).to.equal( file2 );
				expect( bender.files.store ).to.have.keys( [ file2 ] );
				done();
			} );

		expect( file.oldPath ).to.equal( file1 );

		bender.files.send( file1, resp, function() {}, file2 );
	} );


	it( 'should execute error callback if no file found to be send', function( done ) {
		var spy = sinon.spy(),
			resp = mocks.createFakeResponse( spy );

		bender.files.send( fileUnknown, resp, function() {
			expect( spy.called ).to.be.false;
			done();
		} );
	} );

	it( 'should check if the given path matches given patterns', function() {
		var f1 = path.resolve( file1 ),
			f2 = path.resolve( 'test/fixtures/files/test/1.js' );

		expect( bender.files.isValidPath( f1, patterns ) ).to.be.true;
		expect( bender.files.isValidPath( f2, patterns ) ).to.be.false;
	} );

	describe( 'File', function() {
		it( 'should read its content from the FS and return it', function() {
			var file = bender.files.add( file1 ),
				content;

			return file.read()
				.then( function( result ) {
					content = result;

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
					content = result;
					return file.read();
				} )
				.then( function( result ) {
					expect( result ).to.equal( content );
				} );
		} );

		it( 'should check if modified', function() {
			var file = bender.files.add( file1 ),
				content = 'var foo = 1;',
				newContent = 'var foo = 3;';

			return fs.writeFile( file1, content )
				.then( function() {
					return file.read();
				} )
				.then( function( result ) {
					expect( result ).to.equal( content );

					return file.checkModified();
				} )
				.then( function( result ) {
					expect( result ).to.be.false;

					return fs.writeFile( file1, newContent );
				} )
				.delay( 500 )
				.then( function() {
					return file.checkModified();
				} )
				.then( function( result ) {
					expect( result ).to.be.true;

					return fs.writeFile( file1, content );
				} );
		} );

		it( 'should return new content if modified', function() {
			var file = bender.files.add( file1 ),
				content = 'var foo = 1;',
				newContent = 'var foo = 3;';

			return fs.writeFile( file1, content )
				.then( function() {
					return file.read();
				} )
				.then( function( result ) {
					expect( result ).to.equal( content );

					return fs.writeFile( file1, newContent );
				} )
				.delay( 500 )
				.then( function() {
					return file.read();
				} )
				.then( function( result ) {
					expect( result ).to.equal( newContent );

					return fs.writeFile( file1, content );
				} );
		} );

		it( 'should process itself through defined preprocessors', function() {
			var file = bender.files.add( file1 ),
				spy = sinon.spy();

			bender.preprocessors = [ spy ];

			return file.process()
				.then( function() {
					expect( spy.calledWith( file ) ).to.be.true;
				} );
		} );

		it( 'should send it\'s contents in the HTTP response', function( done ) {
			var file = bender.files.add( file1 ),
				resp = mocks.createFakeResponse( function( data ) {
					expect( data ).to.equal( file.content );
					done();
				} );

			file.send( resp );
		} );

		it( 'should call errCallback if something goes wrong while sending', function( done ) {
			var file = bender.files.add( fileUnknown ),
				spySuccess = sinon.spy(),
				resp = mocks.createFakeResponse( spySuccess );

			file.send( resp, function() {
				expect( spySuccess.called ).to.be.false;
				done();
			} );
		} );
	} );
} );
