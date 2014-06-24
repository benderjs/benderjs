/**
 * @file Tests for common Collection class
 */

/*global describe, it */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var Collection = require( '../lib/collection' ),
	EventEmitter = require( 'events' ).EventEmitter,
	expect = require( 'chai' ).expect;

describe( 'Collection', function() {
	var item1 = {
			foo: 1,
			bar: 'test',
			baz: true
		},
		item2 = 'foo',
		item3 = {
			bar: 'test',
			foo: 3
		};

	it( 'should inherit EventEmitter', function() {
		expect( Collection.prototype ).to.be.instanceof( EventEmitter );
	} );

	it( 'should initialize empty', function() {
		var col = new Collection();

		expect( col.get() ).to.be.empty;
	} );

	it( 'should add an item', function() {
		var col = new Collection();

		expect( col.get() ).to.be.empty;
		col.add( 'item1', item1 );
		expect( col.get() ).to.contain( item1 );
	} );

	it( 'should trigger a "change" event while adding an item', function( done ) {
		var col = new Collection();

		col.on( 'change', function handleChange( items ) {
			expect( items ).to.be.not.empty;
			expect( items ).to.contain( item1 );
			col.removeListener( 'change', handleChange );
			done();
		} );

		col.add( 'item1', item1 );
	} );

	it( 'should return an item', function() {
		var col = new Collection();

		col.add( 'item1', item1 );
		expect( col.get( 'item1' ) ).to.exist;
		expect( col.get( 'item1' ) ).to.equal( item1 );
		expect( col.get( 'unknown' ) ).to.not.exist;
	} );

	it( 'should return array of items when passed array to .get() function', function() {
		var col = new Collection(),
			result;

		col.add( 'item1', item1 );
		col.add( 'item2', item2 );
		col.add( 'item3', item3 );

		result = col.get( [ 'item1', 'item3' ] );
		expect( result ).to.be.instanceof( Array );
		expect( result ).to.have.length( 2 );
		expect( result ).to.contain( item1 );
		expect( result ).to.contain( item3 );
	} );

	it( 'should return all items when no argument is passed to .get() function', function() {
		var col = new Collection(),
			result;

		col.add( 'item1', item1 );
		col.add( 'item2', item2 );
		col.add( 'item3', item3 );

		result = col.get();

		expect( result ).to.be.instanceof( Array );
		expect( result ).to.have.length( 3 );
		expect( result ).to.contain( item1 );
		expect( result ).to.contain( item2 );
		expect( result ).to.contain( item3 );
	} );

	it( 'should remove an item', function() {
		var col = new Collection();

		col.add( 'item1', item1 );
		expect( col.get( 'item1' ) ).to.exist;
		col.remove( 'item1' );
		expect( col.get( 'item1' ) ).to.not.exist;

		expect( col.remove( 'item1' ) ).to.be.false;
	} );

	it( 'should trigger a "change" event while removing an item', function( done ) {
		var col = new Collection();

		col.add( 'item1', item1 );
		col.on( 'change', function handleChange( items ) {
			expect( items ).to.be.empty;
			col.removeListener( 'change', handleChange );
			done();
		} );
		col.remove( 'item1' );
	} );

	it( 'should execute callback on every collection item', function() {
		var col = new Collection(),
			calls = 0,
			result = [];

		col.add( 'item1', item1 );
		col.add( 'item2', item2 );

		function callback( item ) {
			result.push( item );
			calls++;
		}

		col.each( callback );

		expect( calls ).to.equal( 2 );
		expect( result ).to.have.length( 2 );
		expect( result ).to.contain( item1 );
		expect( result ).to.contain( item2 );
	} );

	it( 'should return true/false if has/doesn\'t have an item', function() {
		var col = new Collection();

		col.add( 'item1', item1 );
		expect( col.has( item1 ) ).to.be.true;
		expect( col.has( item2 ) ).to.be.false;
	} );

	it( 'should return array of items with a given key->value pair', function() {
		var col = new Collection(),
			result;

		col.add( 'item1', item1 );
		col.add( 'item2', item2 );
		col.add( 'item3', item3 );

		result = col.find( 'bar', 'test' );

		expect( result ).to.be.instanceof( Array );
		expect( result ).to.have.length( 2 );
		expect( result ).to.contain( item1 );
		expect( result ).to.contain( item3 );
		expect( result ).to.not.contain( item2 );
	} );

	it( 'should find one item with given key-value pair', function() {
		var col = new Collection(),
			result;

		col.add( 'item1', item1 );
		col.add( 'item2', item2 );
		col.add( 'item3', item3 );

		result = col.findOne( 'foo', 1 );

		expect( result ).to.be.ok;
		expect( result ).to.equal( item1 );
	} );
} );
