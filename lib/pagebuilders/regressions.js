/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for serving regression information
 */

'use strict';

/**
 * @module pagebuilders/regressions
 */
module.exports = {
	name: 'bender-pagebuilder-regressions',
	/**
	 * Include information about regressions in a test page
	 * @param  {Object} data Test page data
	 * @return {Object}
	 */
	build: function( data ) {
		var bender = this,
			regressions = bender.conf.tests[ data.group ].regressions;

		if ( !regressions ) {
			return data;
		}

		data.parts.push( '<head>\n<script>\n(function () {\n' +
			'bender.regressions = ' + JSON.stringify( regressions ) + ';\n' +
			'})();\n</script>\n</head>' );

		return data;
	}
};
