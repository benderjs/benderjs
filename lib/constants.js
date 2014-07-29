/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Constants used across the application
 */

'use strict';

var pkg = JSON.parse( require( 'fs' ).readFileSync( __dirname + '/../package.json' ).toString() );

/**
 * @module  constants
 */
module.exports = {

	name: 'constants',

	VERSION: pkg.version,
	PORT: 1030,
	HOSTNAME: 'localhost',
	CONFIG_NAME: 'bender.js',

	/**
	 * Attach module to Bender
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
