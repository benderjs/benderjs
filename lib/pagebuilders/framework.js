/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for framework resources
 */

'use strict';

/**
 * @module pagebuilders/framework
 */
module.exports = {
	name: 'bender-pagebuilder-framework',

	/**
	 * Include framework resources in a test page
	 * @param  {Object} data Test page data
	 * @return {Object}
	 */
	build: function( data ) {
		var head = [ '<head>' ],
			bender = this,
			framework;

		if ( !data.framework || !( framework = bender.frameworks.get( data.framework ) ) ) {
			return data;
		}

		// inject all the scripts and stylesheets used by a test frameworkss
		framework.css.forEach( function( css ) {
			head.push( '<link rel="stylesheet" href="' + css + '">' );
		} );
		framework.js.forEach( function( js ) {
			head.push( '<script src="' + js + '"></script>' );
		} );

		head.push( '</head>' );

		data.parts.push( head.join( '' ) );

		return data;
	}
};
