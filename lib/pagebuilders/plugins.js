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
		var head = [ '<head>' ],
			bender = this,
			includes = bender.plugins.getIncludes();

		// inject scripts and stylesheets used by plugins
		includes.css.forEach( function( css ) {
			head.push( '<link rel="stylesheet" href="' + css + '">' );
		} );

		includes.js.forEach( function( js ) {
			head.push( '<script src="' + js + '"></script>' );
		} );

		// nothing was injected
		if ( head.length === 1 ) {
			return data;
		}

		head.push( '</head>' );

		data.parts.push( head.join( '' ) );

		return data;
	}
};
