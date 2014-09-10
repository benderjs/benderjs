/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Default page builder delivering default test page template
 */

'use strict';

var path = require( 'path' ),
	readFile = require( 'when/node' ).lift( require( 'fs' ).readFile ),
	defaultTemplate;

function build( data ) {
	if ( defaultTemplate ) {
		data.parts.push( defaultTemplate );
	} else {
		data.parts.push(
			readFile( path.join( __dirname, '../../static/default.html' ) )
			.then( function( data ) {
				defaultTemplate = data.toString();
				return defaultTemplate;
			} )
		);
	}

	return data;
}

module.exports = {
	name: 'bender-pagebuilder-default',

	build: build,

	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'pagebuilders' );

		bender.pagebuilders.unshift( build );
	}
};
