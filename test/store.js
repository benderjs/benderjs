/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for common Store class
 */

/*global describe, it */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var Store = require( '../lib/store' ),
	expect = require( 'chai' ).expect;

describe( 'Store', function() {
	var item1 = {
			foo: 1,
			bar: true,
			baz: 'qux'
		},
		item2 = {
			foo: 2,
			bar: false,
			baz: 'quux'
		},
		item3 = {
			foo: 3
		};

	it( 'should initialize empty', function() {
		var store = new Store();

		expect( store.list() ).to.be.empty;
		expect( store ).to.have.length( 0 );
	} );

	it( 'should add an item', function() {
		var store = new Store();

		store.add( 'item1', item1 );

		expect( store ).to.have.length( 1 );
	} );

	it( 'should return null if no item found', function() {
		var store = new Store();

		store.add( 'item1', item1 );

		expect( store.get( 'item2' ) ).to.be.null;
	} );

	it( 'should return an item by its name', function() {
		var store = new Store();

		store.add( 'item1', item1 );

		expect( store.get( 'item1' ) ).to.equal( item1 );
	} );

	it( 'should list all the items', function() {
		var store = new Store();

		store.add( 'item1', item1 );
		store.add( 'item2', item2 );

		var list = store.list();

		expect( list ).to.be.an( 'array' );
		expect( list ).to.have.length( 2 );
		expect( list[ 0 ] ).to.equal( item1 );
		expect( list[ 1 ] ).to.equal( item2 );
	} );

	it( 'should place an item with a higher priority before an item with a lower priority', function() {
		var store = new Store();

		store.add( 'item1', item1, 10 );
		// Note: the higher priority the lower number it has
		store.add( 'item2', item2, 1 );

		var list = store.list();

		expect( list[ 0 ] ).to.equal( item2 );
		expect( list[ 1 ] ).to.equal( item1 );
	} );

	it( 'should place items with the same priorities one after another', function() {
		var store = new Store();

		store.add( 'item1', item1, 5 );
		store.add( 'item2', item2, 5 );

		var list = store.list();

		expect( list[ 0 ] ).to.equal( item1 );
		expect( list[ 1 ] ).to.equal( item2 );
	} );

	it( 'should return the highest item priority or null if empty', function() {
		var store = new Store();

		expect( store.getHighestPriority() ).to.be.null;

		store.add( 'item1', item1, 5 );
		store.add( 'item2', item2, 10 );
		store.add( 'item3', item3, 1 );

		expect( store.getHighestPriority() ).to.equal( 1 );
	} );

	it( 'should return the lowest item priority or null if empty', function() {
		var store = new Store();

		expect( store.getLowestPriority() ).to.be.null;

		store.add( 'item1', item1, 5 );
		store.add( 'item2', item2, 10 );
		store.add( 'item3', item3, 1 );

		expect( store.getLowestPriority() ).to.equal( 10 );
	} );

	it( 'should return the priority of an item', function() {
		var store = new Store();

		store.add( 'item1', item1, 5 );
		store.add( 'item2', item2, 10 );

		expect( store.getPriority( 'item1' ) ).to.equal( 5 );
		expect( store.getPriority( 'item2' ) ).to.equal( 10 );
	} );

	it( 'should remove an item', function() {
		var store = new Store();

		store.add( 'item1', item1, 5 );
		store.add( 'item2', item2, 10 );

		expect( store ).to.have.length( 2 );

		store.remove( 'item1' );

		expect( store ).to.have.length( 1 );
		expect( store.get( 'item1' ) ).to.be.null;
		expect( store.get( 'item2' ) ).to.equal( item2 );

		var list = store.list();

		expect( list ).to.have.length( 1 );
		expect( list[ 0 ] ).to.equal( item2 );
	} );
} );
