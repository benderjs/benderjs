/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Base collection
 * @module collection
 */

'use strict';

var util = require( 'util' ),
	EventEmitter = require( 'events' ).EventEmitter;

/**
 * Base collection
 * @memberOf module:collection
 * @extends {EventEmitter}
 * @constructor
 */
function Collection() {
	EventEmitter.call( this );
	this.items = {};
}

util.inherits( Collection, EventEmitter );

/**
 * Add new item to the collection
 * @param {String} id   Item ID
 * @param {*}      item Item to be added
 * @fires module:collection.Collection#change
 * @return {*}
 */
Collection.prototype.add = function( id, item ) {
	this.items[ id ] = item;
	/**
	 * Collection change event
	 * @event module:collection.Collection#change
	 * @type {Object}
	 */
	this.emit( 'change', this.get() );

	return item;
};

/**
 * Remove an item from the collection
 * @param {String} id Item ID
 * @fires module:collection.Collection#change
 */
Collection.prototype.remove = function( id ) {
	if ( this.items[ id ] !== undefined ) {
		delete this.items[ id ];

		this.emit( 'change', this.get() );

		return true;
	}

	return false;
};

/**
 * Get a collection item
 * @param  {String} id Item ID
 * @return {*}
 */
Collection.prototype.get = function( id ) {
	if ( typeof id == 'string' ) {
		return this.items[ id ];
	}

	if ( Array.isArray( id ) ) {
		return id.map( function( name ) {
			return this.items[ name ];
		}, this ).filter( function( item ) {
			return item !== undefined;
		} );
	}

	return this.list().map( function( name ) {
		return this.items[ name ];
	}, this );
};

/**
 * List all collection item IDs
 * @return {Array.<String>}
 */
Collection.prototype.list = function() {
	return Object.keys( this.items );
};

/**
 * Iterate through every collection item and execute a callback on it
 * @param {Function} callback Function to execute on each item
 */
Collection.prototype.each = function( callback ) {
	Object.keys( this.items ).forEach( function( name ) {
		callback( this.items[ name ] );
	}, this );
};

/**
 * Check if the collection contains the given item
 * @param  {*} item Item to check
 * @return {Boolean}
 */
Collection.prototype.has = function( item ) {
	return Object.keys( this.items ).some( function( name ) {
		return this.items[ name ] === item;
	}, this );
};

/**
 * Find an item that contains a property with the given value
 * @param  {String} key   Item property name
 * @param  {*}      value Item property value
 * @return {*}
 */
Collection.prototype.find = function( key, value ) {
	return Object.keys( this.items )
		.filter( function( name ) {
			return this.items[ name ][ key ] === value;
		}, this )
		.map( function( name ) {
			return this.items[ name ];
		}, this );
};

/**
 * Find first item that contains a property with the given value
 * @param  {String} key   Item property name
 * @param  {*}      value Item property value
 * @return {*}
 */
Collection.prototype.findOne = function( key, value ) {
	return this.find( key, value )[ 0 ];
};

module.exports = Collection;
