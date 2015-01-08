/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for framework's resources
 */

'use strict';

module.exports = {
	name: 'bender-pagebuilder-framework',
	build: function( data ) {
		var head = [ '<head>' ],
			bender = this,
			framework;

		if ( !data.framework || !( framework = bender.frameworks.get( data.framework ) ) ) {
			return data;
		}

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
