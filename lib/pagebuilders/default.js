/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Default page builder delivering default test page template
 */

'use strict';

var path = require( 'path' );

module.exports = {
	name: 'bender-pagebuilder-default',

	build: function( data ) {
		var bender = this;

		data.parts.push(
			bender.files.get( path.join( __dirname, '../../static/default.html' ) )
			.then( function( file ) {
				return file.read()
					.then( function( content ) {
						return content.toString();
					} );
			} )
		);

		return data;
	},

	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'pagebuilders' );

		bender.pagebuilders.unshift( module.exports.build );
	}
};
