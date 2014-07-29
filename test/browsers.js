/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Contains tests for Browsers module
 */

/*global describe, it, beforeEach */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './fixtures/_mocks' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	Collection = require( '../lib/collection' ),
	browsers = rewire( '../lib/browsers' );

describe( 'Browsers', function() {
	var configs = {
			invalidBrowser: [ 'Chrome35', '123IE' ]
		},
		clients = {
			Chrome: {
				ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36',
				id: 'bdf3ebc3-d783-4ab0-b4d2-aa590d55c533',
				addr: '127.0.0.1:1030'
			},
			Firefox: {
				ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:30.0) Gecko/20100101 Firefox/30.0',
				id: 'ff8f2536-0069-4e4e-bf1d-55ccc1a18be9',
				addr: '127.0.0.1:1030'
			},
			IE9: {
				ua: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0; SLCC2;' +
					' .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C)',
				id: '0b74cdf1-a8c3-4a14-933b-26e4b85b4a31',
				addr: '127.0.0.1:1030'
			},
			Invalid: {
				id: '6a07a060-8f0a-47a9-91b2-9203a0bf704a',
				addr: '127.0.0.1:1030'
			}
		},
		bender;

	beforeEach( function() {
		bender = mocks.getBender( 'utils', 'conf' );
		bender.use( browsers );
	} );

	it( 'should be an instance of Collection', function() {
		expect( bender.browsers ).to.be.instanceof( Collection );
	} );

	it( 'should initialize on Bender initialization', function() {
		expect( bender.browsers.get() ).to.be.empty;

		bender.init();

		expect( bender.browsers.get() ).to.be.not.empty;
	} );

	it( 'should not add build invalid browser configuration', function() {
		bender.browsers.build( configs.invalidBrowser );

		expect( bender.browsers.get() ).to.have.length( 1 );
		expect( bender.browsers.findOne( 'id', 'Chrome35' ) ).to.exist;
		expect( bender.browsers.findOne( 'id', '123IE' ) ).to.not.exist;
	} );

	it( 'should return a single item if passed a string to .get() function', function() {
		var result;

		bender.browsers.build( bender.conf.browsers );

		result = bender.browsers.get( 'Chrome' );

		expect( result ).to.exist;
		expect( result ).to.be.an( 'object' );
	} );

	it( 'should return array of items if passed array of strings to .get() function', function() {
		var result;

		bender.browsers.build( bender.conf.browsers );

		result = bender.browsers.get( [ 'Chrome', 'Firefox' ] );

		expect( result ).to.have.length( 2 );
	} );

	it( 'should add client with existing browser', function() {
		var result;

		bender.browsers.build( bender.conf.browsers );
		bender.browsers.addClient( clients.Chrome );

		result = bender.browsers.get( 'Chrome' ).clients;

		expect( result.get() ).to.have.length( 1 );
		expect( result.get( clients.Chrome.id ) ).to.exist;
	} );

	it( 'should emit "change" event when client is added', function( done ) {
		bender.browsers.build( bender.conf.browsers );
		bender.browsers.on( 'change', function handleChange( browsers ) {
			var result = bender.browsers.get( 'Firefox' ).clients;

			expect( browsers ).to.have.length( 4 );
			expect( result.get() ).to.have.length( 1 );

			bender.browsers.removeListener( 'change', handleChange );
			done();
		} );

		bender.browsers.addClient( clients.Firefox );
	} );

	it( 'should add client with unknown browser to the Unknown list', function() {
		bender.browsers.build( [ 'IE11' ] );

		expect( bender.browsers.unknown.get() ).to.be.empty;
		expect( bender.browsers.clients.get() ).to.be.empty;

		bender.browsers.addClient( clients.IE9 );

		expect( bender.browsers.unknown.get() ).to.have.length( 1 );
		expect( bender.browsers.clients.get() ).to.be.empty;
	} );

	it( 'should not add invalid client', function() {
		bender.browsers.build( bender.conf.browsers );
		bender.browsers.addClient( clients.Invalid );
		expect( bender.browsers.unknown.get() ).to.be.empty;
		expect( bender.browsers.clients.get() ).to.be.empty;
	} );

	it( 'should remove a client', function() {
		bender.browsers.build( bender.conf.browsers );
		bender.browsers.addClient( clients.IE9 );

		expect( bender.browsers.clients.get() ).to.be.empty;
		expect( bender.browsers.unknown.get() ).to.have.length( 1 );

		bender.browsers.removeClient( clients.IE9 );

		expect( bender.browsers.unknown.get() ).to.be.empty;
		expect( bender.browsers.clients.get() ).to.be.empty;
	} );

	it( 'should emit "change" event when client is removed', function( done ) {
		bender.browsers.build( bender.conf.browsers );
		bender.browsers.addClient( clients.Firefox );
		bender.browsers.on( 'change', function handleChange() {
			var result = bender.browsers.get( 'Firefox' ).clients;

			expect( result.get() ).to.be.empty;

			bender.browsers.removeListener( 'change', handleChange );
			done();
		} );

		bender.browsers.removeClient( clients.Firefox );
	} );

	it( 'should change client ready state', function() {
		var id = clients.Chrome.id,
			results;

		bender.browsers.build( bender.conf.browsers );
		bender.browsers.addClient( clients.Chrome );

		results = bender.browsers.get( 'Chrome' ).clients,

		expect( results.get( id ).ready ).to.be.true;

		bender.browsers.setClientReady( id, false );

		expect( results.get( id ).ready ).to.be.false;
	} );

	it( 'should not break when trying to change ready state of unknown client', function() {
		expect( function() {
			bender.browsers.setClientReady( 'unknown', false );
		} ).to.not.throw();
	} );

	it( 'should emit "change:client" event when a client changes', function( done ) {
		var id = clients.Chrome.id,
			client;

		bender.browsers.build( bender.conf.browsers );
		bender.browsers.addClient( clients.Chrome );

		client = bender.browsers.get( 'Chrome' ).clients.get( id );

		bender.browsers.on( 'client:change', function handleClient( result ) {
			expect( result ).to.equal( client );
			bender.browsers.removeListener( 'client:change', handleClient );
			done();
		} );

		bender.browsers.setClientReady( id );
	} );

} );
