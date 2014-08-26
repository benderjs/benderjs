/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Indexing file for default page builders
 */

'use strict';

var fs = require( 'graceful-fs' ),
	path = require( 'path' );

module.exports = {
	attach: function() {
		var bender = this;

		// include default page builders
		fs.readdirSync( __dirname ).forEach( function( file ) {
			var builder;

			if ( file === 'index.js' ) {
				return;
			}

			builder = require( path.join( __dirname, file ) );

			if ( builder.attach ) {
				bender.use( builder );
			} else {
				bender.plugins.add( builder );
			}
		} );
	}
};
