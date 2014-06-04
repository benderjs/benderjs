/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Indexing file for default Bender reporters
 */

'use strict';

var fs = require( 'fs' ),
	path = require( 'path' ),
	reporters = {};

module.exports = {
	name: 'reporters',

	attach: function() {
		var bender = this;

		bender.reporters = reporters;

		Object.keys( reporters ).forEach( function( name ) {
			bender.use( reporters[ name ] );
		} );
	}
};

fs.readdirSync( __dirname ).forEach( function( file ) {
	var reporter;

	if ( file === 'index.js' ) {
		return;
	}

	reporter = require( path.join( __dirname, file ) );

	reporter.attach = reporter.attach || function() {
		var bender = this;

		bender.onAny( function() {
			if ( typeof reporter[ this.event ] == 'function' ) {
				reporter[ this.event ].apply( bender, arguments );
			}
		} );
	};

	reporters[ path.basename( file, '.js' ) ] = reporter;
} );
