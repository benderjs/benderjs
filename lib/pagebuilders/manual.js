/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for manual tests
 */

'use strict';

var marked = require( 'marked' ),
	path = require( 'path' ),
	when = require( 'when' );

module.exports = {
	name: 'bender-pagebuilder-manual',
	build: function( data ) {
		var bender = this,
			pattern = /@bender\-([\w\-]+)\:([\w \-\.\/\\\:\?\+\$@~_,=#%';!]+)/gi,
			file;

		if ( !data.manual ) {
			return data;
		}

		file = data.snapshot ? path.join( '.bender/jobs/', data.jobId, '/tests/', data.script ) : data.script;

		// removes bender directives @bender- from the script
		function stripDirectives( content ) {
			return content.replace( pattern, '' );
		}

		var promise = bender.files.readString( path.join( __dirname, '../../static/manual.html' ) )
			.then( function( template ) {
				return bender.files.get( file )
					.then( function( result ) {
						return result ?
							result.read()
							.then( function( content ) {
								return bender.utils.template( template.toString(), {
									SCRIPT: marked( stripDirectives( content.toString() ) )
								} );
							} ) :
							when.reject();
					} );
			} );

		data.parts.push( promise );

		return data;
	}
};
