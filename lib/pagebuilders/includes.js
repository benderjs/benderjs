/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for including scripts defined in bender-includes directive
 */

'use strict';

module.exports = {
	name: 'bender-pagebuilder-includes',
	build: function( data ) {
		var bender = this;

		if ( !Array.isArray( data.include ) || !data.include.length ) {
			return data;
		}

		var head = [ '<head>' ];

		data.include.forEach( function( script ) {
			head.push( '<script src="' + bender.template.replaceTags( script, data ) + '"></script>' );
		} );

		head.push( '</head>' );

		data.parts.push( head.join( '\n' ) );

		return data;
	}
};
