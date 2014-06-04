/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Base collection
 */

'use strict';

var util = require( 'util' ),
	EventEmitter = require( 'events' ).EventEmitter;

/**
 * Base collection
 * @extends {EventEmitter}
 * @class Collection
 */
function Collection() {
	EventEmitter.call( this );
	this.items = {};
}

util.inherits( Collection, EventEmitter );

/**
 * Add new item to the collection
 * @param {String} id   Item id
 * @param {*}      item Item to be added
 * @fires Collection#change
 * @return {*}
 */
Collection.prototype.add = function( id, item ) {
	this.items[ id ] = item;
	/**
	 * Collection change event
	 * @event Collection#change
	 * @type {Object}
	 */
	this.emit( 'change', this.get() );

	return item;
};

/**
 * Remove item from the collection
 * @param {String} id Item id
 * @fires Collection#change
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
 * Get collection item
 * @param  {String} id Item id
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
 * List all collection item ids
 * @return {Array.<String>}
 */
Collection.prototype.list = function() {
	return Object.keys( this.items );
};

/**
 * Iterate each collection item and execute a callback on it
 * @param  {Function} callback Function to execute on each item
 */
Collection.prototype.each = function( callback ) {
	Object.keys( this.items ).forEach( function( name ) {
		callback( this.items[ name ] );
	}, this );
};

/**
 * Check if the collection contains given item
 * @param  {*} item Item to check
 * @return {Boolean}
 */
Collection.prototype.has = function( item ) {
	return Object.keys( this.items ).some( function( name ) {
		return this.items[ name ] === item;
	}, this );
};

/**
 * Find item that contains a property with given value
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
 * Find first item that contains a property with given value
 * @param  {String} key   Item property name
 * @param  {*}      value Item property value
 * @return {*}
 */
Collection.prototype.findOne = function( key, value ) {
	return this.find( key, value )[ 0 ];
};

module.exports = Collection;
