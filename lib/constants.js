/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Constants used across the application
 */

'use strict';

var pkg = JSON.parse( require( 'fs' ).readFileSync( __dirname + '/../package.json' ).toString() );

/**
 * Application constants
 * @module constants
 */
module.exports = {

	name: 'constants',

	/**
	 * Bender version
	 * @type {String}
	 */
	VERSION: pkg.version,

	/**
	 * Default HTTP server port
	 * @type {Number}
	 */
	PORT: 1030,

	/**
	 * Default hostname
	 * @type {String}
	 */
	HOSTNAME: 'localhost',

	/**
	 * Default configuration file name
	 * @type {String}
	 */
	CONFIG_NAME: 'bender.js',

	/**
	 * Attach the module to Bender
	 */
	attach: function() {
		var bender = this;

		Object.keys( module.exports ).forEach( function( name ) {
			if ( name === 'name' || name === 'attach' ) {
				return;
			}

			bender[ name ] = module.exports[ name ];
		} );
	}
};
