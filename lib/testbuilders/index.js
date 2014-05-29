"use strict";

/**
 * @file Indexing file for default test builders
 */

var fs = require( 'fs' ),
	path = require( 'path' );

module.exports = {
	name: 'testbuilders',

	attach: function() {
		var bender = this;

		bender.testbuilders = [];

		// include default test builders
		fs.readdirSync( __dirname ).forEach( function( file ) {
			var builder;

			if ( file === 'index.js' ) {
				return;
			}

			builder = require( path.join( __dirname, file ) );

			builder.attach = builder.attach || function() {
				bender.testbuilders.push( builder.build );
			};

			bender.use( builder );
		} );
	}
};
