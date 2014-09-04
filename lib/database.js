/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages databases
 */

'use strict';

var path = require( 'path' ),
	Datastore = require( 'nedb' ),
	_ = require( 'lodash' ),
	logger = require( './logger' ).create( 'database', true );

module.exports = {
	name: 'database',

	attach: function( options ) {
		logger.debug( 'attach' );

		var bender = this,
			database = bender.database = {};

		database.Datastore = Datastore;

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
			logger.debug( 'get', name );

			return database.db[ name ] || database.create( name );
		};

		/**
		 * Create a database
		 * @param  {String} name Database name
		 * @return {Datastore}
		 */
		database.create = function( name ) {
			logger.debug( 'create %s, mode: %s', name, database.mode === database.MODES.FILE ? 'file' : 'memory' );

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
