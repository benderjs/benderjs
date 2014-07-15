/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Sockets module
 */

/*global describe, it, beforeEach, afterEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	sinon = require( 'sinon' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	http = require( 'http' ),
	io = require( 'socket.io-client' ),
	sockets = rewire( '../lib/sockets' ),
	browsers = rewire( '../lib/browsers' );

describe( 'Sockets', function() {
	var ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)' +
		' Chrome/35.0.1916.153 Safari/537.36',
		id = 'bdf3ebc3-d783-4ab0-b4d2-aa590d55c533',
		result = {
			id: 'tests/test/1',
			tbId: 'foo',
			jobId: 'bar',
			success: true
		},
		bender,
		server;

	beforeEach( function() {
		bender = mocks.getBender( 'utils', 'conf' );
		bender.use( [ browsers, sockets ] );
		bender.init();
		server = http.createServer( function() {} );

		bender.sockets.attach( server );

		server.listen( 1031 );
	} );

	afterEach( function() {
		server.close();
	} );

	it( 'should create "sockets" namespace in Bender when attached', function() {
		expect( bender.sockets ).to.be.an( 'object' );
	} );

	it( 'should attach to existing http server', function() {
		expect( bender.sockets ).to.include.keys( [ 'browsers', 'clients', 'dashboards' ] );
	} );

	it( 'should accept dashboard connection and notify about disconnect', function( done ) {
		var socket = io( 'http://localhost:1031/dashboard', {
			forceNew: true
		} );

		socket.on( 'connect', function() {
			socket.disconnect();
		} );

		bender.on( 'dashboard:disconnect', function( id ) {
			expect( id ).to.be.a( 'string' );
			done();
		} );
	} );

	it( 'should accept dashboard registration and emit browsers:update after that', function( done ) {
		var socket = io( 'http://localhost:1031/dashboard', {
				forceNew: true
			} ),
			spy = sinon.spy();

		socket.on( 'connect', function() {
			socket.emit( 'register' );
		} );

		bender.on( 'dashboard:register', spy );

		socket.on( 'browsers:update', function() {
			socket.disconnect();
		} );

		socket.on( 'disconnect', function() {
			expect( spy.calledOnce ).to.be.true;
			// argument for this one is the id of the socket
			expect( spy.args[ 0 ][ 0 ] ).to.be.a( 'string' );
			done();
		} );
	} );

	it( 'should notify connected dashboards about job update', function( done ) {
		var socket = io( 'http://localhost:1031/dashboard', {
				forceNew: true
			} ),
			jobId = 'foo';

		socket.on( 'connect', function() {
			socket.emit( 'register' );
		} );

		socket.on( 'browsers:update', function() {
			bender.emit( 'job:update', jobId );
		} );

		socket.on( 'job:update', function( id ) {
			expect( id ).to.equal( jobId );
			socket.disconnect();
		} );

		socket.on( 'disconnect', function() {
			done();
		} );
	} );

	it( 'should accept client connection and notify about disconnect', function( done ) {
		var socket = io( 'http://localhost:1031/client', {
			forceNew: true
		} );

		socket.on( 'connect', function() {
			socket.disconnect();
		} );

		bender.on( 'client:disconnect', function( id ) {
			expect( id ).to.equal( 'unknown' );
			done();
		} );
	} );

	it( 'should accept client registration', function( done ) {
		var socket = io( 'http://localhost:1031/client', {
			forceNew: true
		} );

		socket.on( 'connect', function() {
			socket.emit( 'register', {
				id: id,
				ua: ua
			}, function callback() {
				socket.disconnect();
			} );
		} );

		bender.on( 'client:register', function( client ) {
			// argument for this one is the id of the socket
			expect( client ).to.be.an( 'object' );
			expect( client.id ).to.equal( id );
			expect( client.ua ).to.equal( ua );
		} );

		socket.on( 'disconnect', function() {
			done();
		} );
	} );

	it( 'should not crash when trying to run a task in disconnected client', function() {
		expect( function() {
			bender.emit( 'job:run', 'unknown', {} );
		} ).to.not.throw();
	} );

	it( 'should run a task on a connected client and mark him as busy', function( done ) {
		var socket = io( 'http://localhost:1031/client', {
				forceNew: true
			} ),
			task = {
				id: 'tests/test/1',
				tbId: 'foo',
				jobId: 'bar'
			};

		bender.on( 'client:fetch', function( client, callback ) {
			callback( task );
		} );

		socket.on( 'connect', function() {
			socket.emit( 'register', {
				id: id,
				ua: ua
			}, function callback() {
				socket.emit( 'fetch', function( task ) {
					expect( task ).to.equal( task );
					socket.disconnect();
				} );
			} );
		} );

		socket.on( 'disconnect', function() {
			done();
		} );
	} );

	it( 'should emit complete event on client\'s request', function( done ) {
		var socket = io( 'http://localhost:1031/client', {
			forceNew: true
		} );

		bender.on( 'client:complete', function( data ) {
			expect( data ).to.be.an( 'object' );
			expect( data.id ).to.equal( result.id );
			expect( data.tbId ).to.equal( result.tbId );
			expect( data.jobId ).to.equal( result.jobId );
			expect( data.success ).to.equal( result.success );
			socket.disconnect();
		} );

		socket.on( 'connect', function() {
			socket.emit( 'register', {
				id: id,
				ua: ua
			}, function callback() {
				socket.emit( 'complete', result );
			} );
		} );

		socket.on( 'disconnect', function() {
			done();
		} );
	} );

	it( 'should ignore complete requests from unknown clients', function( done ) {
		var socket = io( 'http://localhost:1031/client', {
				forceNew: true
			} ),
			spy = sinon.spy();

		bender.on( 'client:complete', spy );

		socket.on( 'connect', function() {
			socket.emit( 'register', {
				id: id,
				ua: 'unknown'
			}, function callback() {
				socket.emit( 'complete' );

				setTimeout( function() {
					expect( spy.called ).to.be.false;
					done();
				}, 50 );
			} );
		} );
	} );

	it( 'should emit results from a client', function( done ) {
		var socket = io( 'http://localhost:1031/client', {
			forceNew: true
		} );

		socket.on( 'connect', function() {
			socket.emit( 'register', {
				id: id,
				ua: ua
			}, function callback() {
				socket.emit( 'result', result );
			} );
		} );

		bender.on( 'client:result', function( data ) {
			expect( data.result ).to.deep.equal( result );
			socket.disconnect();
		} );

		socket.on( 'disconnect', function() {
			done();
		} );
	} );

	it( 'should emit client\'s fetch request', function( done ) {
		var socket = io( 'http://localhost:1031/client', {
			forceNew: true
		} );

		bender.on( 'client:fetch', function( client ) {
			expect( client ).to.be.an( 'object' );
			socket.disconnect();
		} );

		socket.on( 'connect', function() {
			socket.emit( 'register', {
				id: id,
				ua: ua
			}, function callback() {
				socket.emit( 'fetch' );
			} );
		} );

		socket.on( 'disconnect', function() {
			done();
		} );
	} );

	it( 'should ignore fetch requests from unknown clients', function( done ) {
		var socket = io( 'http://localhost:1031/client', {
				forceNew: true
			} ),
			spy = sinon.spy();

		bender.on( 'client:fetch', spy );

		socket.on( 'connect', function() {
			socket.emit( 'register', {
				id: id,
				ua: 'unknown'
			}, function callback() {
				socket.emit( 'fetch' );

				setTimeout( function() {
					expect( spy.called ).to.be.false;
					done();
				}, 50 );
			} );
		} );
	} );

	it( 'should emit client\'s error', function( done ) {
		var socket = io( 'http://localhost:1031/client', {
				forceNew: true
			} ),
			error = 'foo';

		bender.on( 'client:error', function( data ) {
			expect( data ).to.equal( error );
			socket.disconnect();
		} );

		socket.on( 'connect', function() {
			socket.emit( 'err', error );
		} );

		socket.on( 'disconnect', function() {
			done();
		} );
	} );

	it( 'should emit client\'s log', function( done ) {
		var socket = io( 'http://localhost:1031/client', {
				forceNew: true
			} ),
			msg = 'foo';

		bender.on( 'client:log', function( data ) {
			expect( data ).to.equal( msg );
			socket.disconnect();
		} );

		socket.on( 'connect', function() {
			socket.emit( 'log', msg );
		} );

		socket.on( 'disconnect', function() {
			done();
		} );
	} );
} );
