/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Queues module
 */

/*global describe, it, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	sinon = require( 'sinon' ),
	_ = require( 'lodash' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	browsersModule = rewire( '../lib/browsers' ),
	queues = rewire( '../lib/queues' );

describe( 'Queues', function() {
	var bender,
		browsers = [ 'chrome36', 'firefox' ],
		invalidBrowsers = [ '123 123', 'qwe 123' ],
		client = {
			id: 'abcd-1234',
			name: 'chrome',
			version: '36'
		},
		tests = [ {
			id: 'test/fixtures/tests/test/1',
			_id: 'ECNtxgcMzm94aQc9',
			taskId: 'ECNtxgcMzm94aQc9',
			jobId: 'AYIlcxZa1i1nhLox',
			results: [ {
				name: 'chrome',
				version: 0,
				jobId: 'AYIlcxZa1i1nhLox',
				status: 0,
				retries: 0
			} ]
		}, {
			id: 'test/fixtures/tests/test/1?foo=bar',
			_id: 'ECNtxgcMzm94aQc8',
			taskId: 'ECNtxgcMzm94aQc8',
			jobId: 'AYIlcxZa1i1nhLox',
			results: [ {
				name: 'chrome',
				version: 0,
				jobId: 'AYIlcxZa1i1nhLox',
				status: 0,
				retries: 0
			} ]
		}, {
			id: 'test/fixtures/tests/test/2',
			_id: 'qxXbaXERyznmKIhz',
			taskId: 'qxXbaXERyznmKIhz',
			jobId: 'AYIlcxZa1i1nhLox',
			results: [ {
				name: 'chrome',
				version: 0,
				jobId: 'AYIlcxZa1i1nhLox',
				status: 0,
				retries: 0
			} ]
		} ],
		tests1 = [ tests[ 0 ] ];

	beforeEach( function() {
		bender = mocks.getBender( 'conf', 'utils' );

		bender.use( [ browsersModule, queues ] );
		bender.init();
	} );

	it( 'should expose an instance of QueueManager in bender.queues when attached', function() {
		expect( bender.queues ).to.be.instanceof( queues.QueueManager );
	} );

	it( 'should build queues for the given browsers', function() {
		bender.queues.buildQueues( browsers );
		expect( Object.keys( bender.queues.queues ) ).to.have.length( browsers.length );
		_.forEach( bender.queues.queues, function( queue ) {
			expect( queue ).to.be.instanceof( queues.Queue );
		} );
	} );

	it( 'should return a queue if a client object was given', function() {
		bender.queues.buildQueues( browsers );
		expect( bender.queues.findQueue( client ) ).to.be.instanceof( queues.Queue );
	} );

	it( 'should return a queue if a browser name was given', function() {
		bender.queues.buildQueues( browsers );
		expect( bender.queues.findQueue( browsers[ 0 ] ) ).to.be.instanceof( queues.Queue );
	} );

	it( 'should return a queue that didn\'t have a version specified, but the client has', function() {
		bender.queues.buildQueues( browsers );
		expect( bender.queues.findQueue( 'firefox31' ) ).to.be.instanceof( queues.Queue );
	} );

	it( 'shouldn\'t return anything if invalid browser name was given', function() {
		bender.queues.buildQueues( invalidBrowsers );
		expect( bender.queues.findQueue() ).to.not.exist;
		invalidBrowsers.forEach( function( browser ) {
			expect( bender.queues.findQueue( browser ) ).to.not.exist;
		} );
	} );

	it( 'shouldn\'t try to add tests to non-existent queue', function() {
		expect( bender.queues.addTests( 'unknown', tests ) ).to.be.false;
	} );

	it( 'shouldn\'t try to add tests if invalid browser name was given', function() {
		expect( bender.queues.addTests( invalidBrowsers[ 0 ], tests ) ).to.be.false;
	} );

	it( 'should add tests to an existing queue if browser name was given', function() {
		var queue;

		bender.queues.buildQueues( browsers );

		expect( bender.queues.addTests( browsers[ 0 ], tests ) ).to.be.true;
		queue = bender.queues.findQueue( browsers[ 0 ] );
		expect( queue ).to.be.instanceof( queues.Queue );
		expect( queue.tests ).to.deep.equal( tests );
	} );

	it( 'should add tests to an existing queue if client object was given', function() {
		var queue;

		bender.queues.buildQueues( browsers );

		expect( bender.queues.addTests( client, tests ) ).to.be.true;
		queue = bender.queues.findQueue( client );
		expect( queue ).to.be.instanceof( queues.Queue );
		expect( queue.tests ).to.deep.equal( tests );
	} );

	it( 'should return a test for existing client', function() {
		bender.queues.buildQueues( browsers );
		bender.queues.addTests( client, tests );

		expect( bender.queues.getTest( client ) ).to.exist;
	} );

	it( 'should complete a test taken by a client', function() {
		var queue,
			test;

		bender.queues.buildQueues( browsers );
		bender.queues.addTests( client, tests1 );
		test = bender.queues.getTest( client );
		bender.queues.done( client );

		queue = bender.queues.findQueue( client );

		expect( queue.tests ).to.have.length( 0 );
		expect( queue.clients[ client.id ] ).to.have.length( 0 );
	} );

	it( 'should emit queues:complete event if no more tests available', function() {
		var spy = sinon.spy(),
			queue,
			test;

		bender.on( 'queues:complete', spy );

		bender.queues.buildQueues( browsers );
		bender.queues.addTests( client, tests1 );

		queue = bender.queues.findQueue( client );
		test = bender.queues.getTest( client );
		expect( test ).to.exist;
		bender.queues.done( client );

		expect( bender.queues.getTest( client ) ).to.not.exist;
		expect( spy.calledOnce ).to.be.true;
	} );

	it( 'should emit client:run event after a client connects and there\'s a test for him', function( done ) {
		bender.on( 'client:run', function( id, test ) {
			expect( id ).to.equal( client.id );
			expect( test ).to.equal( tests1[ 0 ] );
			done();
		} );

		bender.queues.buildQueues( browsers );
		bender.queues.addTests( client, tests1 );
		bender.emit( 'client:afterRegister', client );
	} );

	it( 'should emit client:run event after a client completes a test and there\'s another test for him', function( done ) {
		var test;

		bender.on( 'client:run', function( id, test ) {
			expect( id ).to.equal( client.id );
			expect( test ).to.equal( tests[ 1 ] );
			done();
		} );

		bender.queues.buildQueues( browsers );
		bender.queues.addTests( client, tests );

		test = bender.queues.getTest( client );

		bender.emit( 'client:complete', _.merge( {
			client: client
		}, test ) );
	} );

	it( 'should emit client:run while adding new tests to the queue and there\'s a client waiting', function( done ) {
		var test;

		bender.on( 'client:run', function( id, test ) {
			expect( id ).to.equal( client.id );
			expect( test ).to.equal( tests[ 0 ] );
			done();
		} );

		bender.queues.buildQueues( browsers );
		bender.queues.addTests( client, tests1 );

		test = bender.queues.getTest( client );
		bender.queues.done( client );

		expect( bender.queues.getTest( client ) ).to.not.exist;

		bender.queues.addTests( client, tests );
	} );

	it( 'should push a test taken by a client back to the queue during client removal', function() {
		var queue,
			test;

		bender.queues.buildQueues( browsers );
		bender.queues.addTests( client, tests1 );

		queue = bender.queues.findQueue( client );
		test = bender.queues.getTest( client );

		expect( queue.tests ).to.have.length( 0 );
		expect( Object.keys( queue.clients ) ).to.have.length( 1 );

		bender.queues.removeClient( client );

		expect( queue.tests ).to.have.length( 1 );
		expect( Object.keys( queue.clients ) ).to.have.length( 0 );
	} );

	it( 'shouldn\'t try to remove any test from the queue if unknown or invalid browser was given', function() {
		var queue;

		bender.queues.buildQueues( browsers );
		bender.queues.addTests( client, tests );

		queue = bender.queues.findQueue( client );

		expect( bender.queues.removeTests( 'unknown', tests1 ) ).to.be.false;
		expect( bender.queues.removeTests( invalidBrowsers[ 0 ], tests1 ) ).to.be.false;
		expect( queue.tests ).to.have.length( 3 );
	} );

	it( 'should remove a specified test from queues', function() {
		var queue;

		bender.queues.buildQueues( browsers );
		bender.queues.addTests( client, tests );

		queue = bender.queues.findQueue( client );

		expect( queue.tests ).to.have.length( 3 );

		expect( bender.queues.removeTests( client, tests1 ) ).to.be.true;

		expect( queue.tests ).to.have.length( 2 );
	} );

	it( 'should remove a client when it disconnects', function() {
		var spy = sinon.spy( bender.queues, 'removeClient' );

		bender.emit( 'client:disconnect', client );

		expect( spy.calledOnce ).to.be.true;

		spy.restore();
	} );

	it( 'should add tests to the queues on tasks:add event', function() {
		var spy = sinon.spy( bender.queues, 'addTests' );

		bender.emit( 'tasks:add', client, tests );

		expect( spy.calledOnce ).to.be.true;

		spy.restore();
	} );

	it( 'should remove tests to the queues on tasks:remove event', function() {
		var spy = sinon.spy( bender.queues, 'removeTests' );

		bender.emit( 'tasks:remove', client, tests );

		expect( spy.calledOnce ).to.be.true;

		spy.restore();
	} );
} );
