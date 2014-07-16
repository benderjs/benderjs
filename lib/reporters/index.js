/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Indexing file for default Bender reporters
 */

'use strict';

var fs = require( 'fs' ),
	path = require( 'path' );

module.exports = {
	attach: function() {
		var bender = this;

		fs.readdirSync( __dirname ).forEach( function( file ) {
			var reporter;

			if ( file === 'index.js' ) {
				return;
			}

			reporter = require( path.join( __dirname, file ) );

			if ( reporter.attach ) {
				bender.use( reporter );
			} else {
				bender.plugins.add( reporter );
			}
		} );
	}
};
