/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Base store
 */

'use strict';

/**
 * Base store
 * @class Store
 */
function Store() {
	var list = this._list = [];

	this._items = {};

	Object.defineProperty( this, 'length', {
		get: function() {
			return list.length;
		}
	} );
}

Store.prototype = {

	/**
	 * Add an item to the store
	 * @param {String} id            ID for the item
	 * @param {*}      item          Item to add
	 * @param {Number} [priority=10] Priority of the item, a lower number means a higher priority
	 */
	add: function( id, item, priority ) {
		if ( typeof priority != 'number' ) {
			priority = 10;
		}

		item = [ id, item, priority ];

		// an item with the same ID exists so we have to remove it first
		if ( this._items[ id ] ) {
			this.remove( id );
		}

		// add to the hashmap
		this._items[ id ] = item;

		for ( var i = this._list.length - 1; i >= 0; i-- ) {
			// current item has a lower or equal priority so add the item after it
			if ( this._list[ i ][ 2 ] <= priority ) {
				this._list.splice( i + 1, 0, item );
				return;
			}
		}

		// new item has the lowest priority so add it as first
		this._list.unshift( item );
	},

	/**
	 * Get an item with the given ID
	 * @param  {String} id Id of an Item
	 * @return {*|Null}
	 */
	get: function( id ) {
		return this._items[ id ] ? this._items[ id ][ 1 ] : null;
	},

	/**
	 * Get the highest item priority
	 * @return {Number|Null}
	 */
	getHighestPriority: function() {
		return this._list[ 0 ] ? this._list[ 0 ][ 2 ] : null;
	},

	/**
	 * Get the lowest item priority
	 * @return {Number|Null}
	 */
	getLowestPriority: function() {
		var len = this.length;

		return len > 0 ? this._list[ len - 1 ][ 2 ] : null;
	},

	/**
	 * Get the priority of an item with th given ID
	 * @return {Number|Null}
	 */
	getPriority: function( id ) {
		return this._items[ id ] ? this._items[ id ][ 2 ] : null;
	},

	/**
	 * List all the items in the store in an array. The items will be ordered using their priorities
	 * @return {Array{*}}
	 */
	list: function() {
		return this._list.map( function( item ) {
			return item[ 1 ];
		}, this );
	},

	/**
	 * Remove an item with the given ID from the store
	 * @param {String} id ID of an item
	 */
	remove: function( id ) {
		delete this._items[ id ];

		for ( var i = this._list.length - 1; i >= 0; i-- ) {
			if ( this._list[ i ][ 0 ] === id ) {
				this._list.splice( i, 1 );
				return;
			}
		}
	}
};


module.exports = Store;
