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
	name: 'middleware',

	attach: function() {
		var bender = this;

		bender.middleware = [];

		// include default middleware
		fs.readdirSync( __dirname ).forEach( function( file ) {
			var middleware;

			if ( file === 'index.js' ) {
				return;
			}

			middleware = require( path.join( __dirname, file ) );

			middleware.attach = middleware.attach || function() {
				bender.middleware.push( middleware.create );
			};

			bender.use( middleware );
		} );
	}
};
