/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for framework's resources
 */

'use strict';

function build( data ) {
	var head = [ '<head>' ];

	if ( !data.framework ) {
		return data;
	}

	data.framework.css.forEach( function( css ) {
		head.push( '<link rel="stylesheet" href="' + css + '">' );
	} );
	data.framework.js.forEach( function( js ) {
		head.push( '<script src="' + js + '"></script>' );
	} );

	head.push( '</head>' );

	data.parts.push( head.join( '' ) );

	return data;
}

module.exports = {
	name: 'bender-pagebuilder-framework',
	build: build
};
