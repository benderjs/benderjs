/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Database module
 */

/*global describe, it, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	fs = require( 'fs' ),
	path = require( 'path' ),
	rewire = require( 'rewire' ),
	database = rewire( '../lib/database' ),
	dir = path.normalize( 'test/fixtures/database/.bender/' );

describe( 'Database', function() {
	var store1 = 'test1.db',
		store2 = 'test2.db',
		store3 = 'test3',
		storePath1 = path.join( dir, 'test1.db' ),
		storePath2 = path.join( dir, 'test2.db' ),
		storePath3 = path.join( dir, 'test3.db' ),
		data1 = {
			foo: 1
		},
		bender;

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils' );
	} );

	it( 'should expose bender.database namespace and its API', function() {
		bender.use( [ database ] );
		expect( bender.database ).to.exist;
		expect( bender.database ).to.have.keys( [
			'MODES', 'mode', 'db', 'dir', 'get', 'create', 'Datastore'
		] );
	} );

	it( 'should allow to pass a configuration object while loading a module', function() {
		bender.use( [ database ], {
			inMemory: true
		} );

		expect( bender.database.mode ).to.equal( bender.database.MODES.MEMORY );
	} );

	it( 'should create a datastore in memory mode', function( done ) {
		var db;

		bender.use( [ database ] );
		bender.database.mode = bender.database.MODES.MEMORY;
		bender.database.create( store1 );

		db = bender.database.get( store1 );

		expect( db ).to.be.instanceof( bender.database.Datastore );

		db.insert( data1, function( err, result ) {
			expect( result ).to.have.keys( [ 'foo', '_id' ] );
			expect( fs.existsSync( storePath1 ) ).to.be.false;
			done();
		} );
	} );

	it( 'should create a datastore in a persistent mode', function( done ) {
		var db;

		bender.use( [ database ] );
		bender.database.dir = dir;
		bender.database.mode = bender.database.MODES.FILE;
		bender.database.create( store1 );

		db = bender.database.get( store1 );

		expect( db ).to.be.instanceof( bender.database.Datastore );

		db.insert( data1, function( err, result ) {
			expect( result ).to.have.keys( [ 'foo', '_id' ] );
			expect( fs.existsSync( storePath1 ) ).to.be.true;
			fs.unlinkSync( storePath1 );
			done();
		} );
	} );

	it( 'should add ".db" extension while create a datastore in a persistent mode', function( done ) {
		var db;

		bender.use( [ database ] );
		bender.database.dir = dir;
		bender.database.mode = bender.database.MODES.FILE;
		bender.database.create( store3 );

		db = bender.database.get( store3 );

		expect( db ).to.be.instanceof( bender.database.Datastore );

		db.insert( data1, function( err, result ) {
			expect( result ).to.have.keys( [ 'foo', '_id' ] );
			expect( fs.existsSync( storePath3 ) ).to.be.true;
			fs.unlinkSync( storePath3 );
			done();
		} );
	} );

	it( 'should restore existing persistent database', function( done ) {
		var db;

		expect( fs.existsSync( storePath2 ) ).to.be.true;

		bender.use( [ database ] );
		bender.database.dir = dir;
		bender.database.mode = bender.database.MODES.FILE;

		db = bender.database.get( store2 );

		expect( db ).to.be.instanceof( bender.database.Datastore );

		db.find( {}, function( err, results ) {
			expect( results ).to.have.length( 1 );
			expect( results[ 0 ] ).to.have.keys( [ 'foo', '_id' ] );
			done();
		} );
	} );
} );
