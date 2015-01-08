/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Base store
 */

'use strict';

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
	add: function( name, item, priority ) {
		if ( typeof priority != 'number' ) {
			priority = 10;
		}

		item = [ name, item, priority ];

		// add to the hashmap
		this._items[ name ] = item;

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

	get: function( id ) {
		return this._items[ id ] ? this._items[ id ][ 1 ] : null;
	},

	getHighestPriority: function() {
		return this._list[ 0 ] ? this._list[ 0 ][ 2 ] : null;
	},

	getLowestPriority: function() {
		var len = this.length;

		return len > 0 ? this._list[ len - 1 ][ 2 ] : null;
	},

	getPriority: function( id ) {
		return this._items[ id ] ? this._items[ id ][ 2 ] : null;
	},

	list: function() {
		return this._list.map( function( item ) {
			return item[ 1 ];
		}, this );
	},

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
