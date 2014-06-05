/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for tests html
 */

'use strict';

var readFile = require( 'when/node' ).lift( require( 'fs' ).readFile ),
	path = require( 'path' );

function build( data ) {
	var file;

	if ( !data.html ) {
		return data;
	}

	file = data.jobId ? path.join( '.bender/jobs/', data.jobId, '/tests/', data.html ) : data.html;

	data.parts.push( readFile( file ).then( function( html ) {
		return html.toString();
	} ) );

	return data;
}

module.exports = {
	name: 'bender-pagebuilder-html',
	build: build
};
