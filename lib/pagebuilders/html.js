/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for tests html
 */

'use strict';

var readFile = require( 'when/node' ).lift( require( 'fs' ).readFile );

function build( data ) {
	if ( !data.html ) {
		return data;
	}

	data.parts.push( readFile( data.html ).then( function( html ) {
		return html.toString();
	} ) );

	return data;
}

module.exports = {
	name: 'bender-pagebuilder-html',
	build: build
};
