/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages databases
 */

var path = require( 'path' ),
	Datastore = require( 'nedb' ),
	_ = require( 'lodash' );

module.exports = {
	name: 'database',

	attach: function( options ) {
		var bender = this,
			database = bender.database = {};

		database.db = {};

		database.MODES = {
			FILE: 0,
			MEMORY: 1
		};

		database.mode = database.MODES[ options && options.inMemory ? 'MEMORY' : 'FILE' ];

		/**
		 * Return an instance of a database. Create new one if necessary
		 * @param  {String} name Database name
		 * @return {Datastore}
		 */
		database.get = function( name ) {
			return database.db[ name ] || database.create( name );
		};

		/**
		 * Create a database
		 * @param  {String} name Database name
		 * @return {Datastore}
		 */
		database.create = function( name ) {
			if ( database.mode === database.MODES.FILE ) {
				database.db[ name ] = new Datastore( {
					filename: path.join(
						process.cwd(), '/.bender/', name + ( name.indexOf( '.db' ) === -1 ? '.db' : '' )
					),
					autoload: true
				} );
			} else {
				database.db[ name ] = new Datastore();
			}

			_.bindAll( database.db[ name ] );

			return database.db[ name ];
		};
	}
};
