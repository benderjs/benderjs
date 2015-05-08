/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages databases
 */

'use strict';

var path = require( 'path' ),
	Datastore = require( 'nedb' ),
	_ = require( 'lodash' ),
	logger = require( './logger' ).create( 'database', true );

/**
 * @module database
 */
module.exports = {

	name: 'database',

	attach: function( options ) {
		logger.debug( 'attach' );

		var bender = this,
			/**
			 * Database manager
			 * @type {module:database}
			 * @memberOf module:bender
			 */
			database = bender.database = {};

		/**
		 * Datastore
		 * @type {Datastore}
		 * @memberOf module:database
		 * @name Datastore
		 */
		database.Datastore = Datastore;

		/**
		 * Default database directory
		 * @type {String}
		 * @memberOf module:database
		 * @name dir
		 */
		database.dir = path.join( process.cwd(), '.bender/' );

		/**
		 * Collection of databases
		 * @type {Object}
		 * @memberOf module:database
		 * @name db
		 */
		database.db = {};

		/**
		 * Database modes
		 * @type {Object}
		 * @enum
		 * @memberOf module:database
		 * @name MODES
		 */
		database.MODES = {
			FILE: 0,
			MEMORY: 1
		};

		/**
		 * Database mode
		 * @type {Number}
		 * @memberOf module:database
		 * @name mode
		 */
		database.mode = database.MODES[ options && options.inMemory ? 'MEMORY' : 'FILE' ];

		/**
		 * Return an instance of a database. Create a new one if necessary
		 * @param  {String} name Database name
		 * @return {Datastore}
		 * @memberOf module:database
		 * @method get
		 */
		database.get = function( name ) {
			logger.debug( 'get', name );

			return database.db[ name ] || database.create( name );
		};

		/**
		 * Create a database
		 * @param  {String} name Database name
		 * @return {Datastore}
		 * @memberOf module:database
		 * @method create
		 */
		database.create = function( name ) {
			logger.debug( 'create %s, mode: %s', name, database.mode === database.MODES.FILE ? 'file' : 'memory' );

			if ( database.mode === database.MODES.FILE ) {
				database.db[ name ] = new Datastore( {
					filename: path.join( database.dir, name + ( name.indexOf( '.db' ) === -1 ? '.db' : '' ) ),
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
