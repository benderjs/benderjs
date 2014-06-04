/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for assertion library resources
 */

'use strict';

function build( data ) {
	var head = [ '<head>' ];

	if ( !data.assertion ) {
		return data;
	}

	data.assertion.css.forEach( function( css ) {
		head.push( '<link rel="stylesheet" href="' + css + '">' );
	} );
	data.assertion.js.forEach( function( js ) {
		head.push( '<script src="' + js + '"></script>' );
	} );

	head.push( '</head>' );

	data.parts.push( head.join( '' ) );

	return data;
}

module.exports = {
	name: 'bender-pagebuilder-assertion',
	build: build
};
