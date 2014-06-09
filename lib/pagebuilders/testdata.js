/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for serving test data
 */

'use strict';

function build( data ) {
	var testData = {},
		ignore = [ '_id', 'assertion', 'applications', 'parts' ];

	Object.keys( data ).forEach( function( key ) {
		if ( ignore.indexOf( key ) > -1 ) {
			return;
		}

		testData[ key ] = data[ key ];
	} );

	data.parts.push( '<head>\n<script>\n(function () {\n' +
		'bender.testData = ' + JSON.stringify( testData ) + ';\n' +
		'})();\n</script>\n</head>' );

	return data;
}

module.exports = {
	name: 'bender-pagebuilder-testdata',
	build: build
};
