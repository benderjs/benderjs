/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for manual tests
 */

'use strict';

var marked = require( 'marked' ),
	path = require( 'path' );

/**
 * @module pagebuilders/manual
 */
module.exports = {
	name: 'bender-pagebuilder-manual',
	/**
	 * Include manual test script and template in a test page
	 * @param  {Object} data Test page data
	 * @return {Object}
	 */
	build: function( data ) {
		var bender = this,
			pattern = /@bender\-([\w\-]+)\:([\w \-\.\/\\\:\?\+\$@~_,=#%';!]+)/gi,
			file;

		if ( !data.manual ) {
			return data;
		}

		file = data.snapshot ? path.join( '.bender/jobs/', data.jobId, '/tests/', data.script ) : data.script;

		// removes bender directives (@bender-*) from the script
		function stripDirectives( content ) {
			return content.replace( pattern, '' );
		}

		var promise = bender.files.readString( path.join( __dirname, '../../static/manual.html' ) )
			.then( function( template ) {
				file = bender.files.get( file );

				return file.read()
					.then( function( content ) {
						return bender.utils.template( template.toString(), {
							SCRIPT: marked( stripDirectives( content.toString() ) )
						} );
					} );
			} );

		data.parts.push( promise );

		return data;
	}
};
