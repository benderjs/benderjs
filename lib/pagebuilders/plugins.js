/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for including plugin resources
 */

'use strict';

/**
 * @module pagebuilders/plugins
 */
module.exports = {
	name: 'bender-pagebuilder-plugins',
	/**
	 * Include plugin resources in a test page
	 * @param  {Object} data Test page data
	 * @return {Object}
	 */
	build: function( data ) {
		var bender = this,
			includes = bender.plugins.getIncludes();

		// inject scripts and stylesheets used by plugins
		includes.css.forEach( function( css ) {
			data.addCSS( css );
		} );

		includes.js.forEach( function( js ) {
			data.addJS( js );
		} );

		return data;
	}
};
