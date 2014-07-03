/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for including scripts defined in bender-includes directive
 */

'use strict';

module.exports = {
	name: 'bender-pagebuilder-includes',
	attach: function() {
		var bender = this;

		function build( data ) {
			var includes = data.include ? data.include.replace( /\s+/g, '' ).split( ',' ) : [],
				head = [ '<head>' ];

			if ( !includes.length ) {
				return data;
			}

			includes.forEach( function( script ) {
				head.push( '<script src="' + bender.template.replaceTags( script, data ) + '"></script>' );
			} );

			head.push( '</head>' );

			data.parts.push( head.join( '\n' ) );

			return data;
		}

		module.exports.build = build;
		bender.pagebuilders.push( build );
	}
};
