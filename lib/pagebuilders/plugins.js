/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for including plugins resources
 */

'use strict';

module.exports = {
	name: 'bender-pagebuilder-plugins',
	build: function( data ) {
		var head = [ '<head>' ],
			bender = this,
			includes = bender.plugins.getIncludes();

		includes.css.forEach( function( css ) {
			head.push( '<link rel="stylesheet" href="' + css + '">' );
		} );

		includes.js.forEach( function( js ) {
			head.push( '<script src="' + js + '"></script>' );
		} );

		if ( head.length === 1 ) {
			return data;
		}

		head.push( '</head>' );

		data.parts.push( head.join( '' ) );

		return data;
	}
};
