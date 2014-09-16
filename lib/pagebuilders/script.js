/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for tests script
 */

'use strict';

var readFile = require( 'when/node' ).lift( require( 'fs' ).readFile ),
	path = require( 'path' );

module.exports = {
	name: 'bender-pagebuilder-script',
	build: function( data ) {
		var file;

		if ( !data.js ) {
			return data;
		}

		file = data.snapshot ? path.join( '.bender/jobs/', data.jobId, '/tests/', data.js ) : data.js;

		data.parts.push( readFile( file ).then( function( script ) {
			return '<script>\n(function (bender) {\n' + script +
				'\n})(window.bender || {});\n</script>';
		} ) );

		return data;
	},
	attach: function() {
		this.pagebuilders.push( module.exports.build );
	}
};
