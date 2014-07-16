/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Indexing file for default HTTP Server middleware
 */

'use strict';

var fs = require( 'fs' ),
	path = require( 'path' );

module.exports = {
	attach: function() {
		var bender = this;

		// include default middleware
		fs.readdirSync( __dirname ).forEach( function( file ) {
			var middleware;

			if ( file === 'index.js' ) {
				return;
			}

			middleware = require( path.join( __dirname, file ) );

			if ( middleware.attach ) {
				bender.use( middleware );
			} else {
				bender.plugins.add( middleware );
			}
		} );
	}
};
