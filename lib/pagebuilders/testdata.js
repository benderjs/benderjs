/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for serving test data
 */

'use strict';

var _ = require( 'lodash' );

module.exports = {
	name: 'bender-pagebuilder-testdata',
	build: function( data ) {
		var ignore = [ '_id', 'framework', 'applications', 'parts' ];

		data.parts.push( '<head>\n<script>\n(function () {\n' +
			'bender.testData = ' + JSON.stringify( _.omit( data, ignore ) ) + ';\n' +
			'})();\n</script>\n</head>' );

		return data;
	}
};
