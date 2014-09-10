/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for application resources
 */

'use strict';

module.exports = {
	name: 'bender-pagebuilder-applications',
	build: function( data ) {
		var head = [ '<head>' ];

		if ( !Array.isArray( data.applications ) || !data.applications.length ) {
			return data;
		}

		data.applications.forEach( function( app ) {
			app.css.forEach( function( css ) {
				head.push( '<link rel="stylesheet" href="' + css + '">' );
			} );
			app.js.forEach( function( js ) {
				head.push( '<script src="' + js + '"></script>' );
			} );
		} );

		head.push( '</head>' );

		data.parts.push( head.join( '' ) );

		return data;
	}
};
