/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Indexing file for default HTTP Server middlewares
 */

'use strict';

var fs = require( 'graceful-fs' ),
	path = require( 'path' );

module.exports = {
	attach: function() {
		var bender = this;

		// include default middlewares
		fs.readdirSync( __dirname ).forEach( function( file ) {
			var middleware;

			if ( file === 'index.js' ) {
				return;
			}

			middleware = require( path.join( __dirname, file ) );

			if ( !middleware.attach ) {
				middleware.attach = function() {
					bender.plugins.add( middleware );
				};
			}

			bender.use( middleware );
		} );
	}
};
