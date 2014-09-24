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
			file;

		if ( !data.manual ) {
			return data;
		}

		file = data.snapshot ? path.join( '.bender/jobs/', data.jobId, '/tests/', data.script ) : data.script;

		function getTemplate() {
			return bender.files.get( path.join( __dirname, '../../static/manual.html' ) )
				.then( function( file ) {
					return file ?
						file.read( function( content ) {
							return content.toString();
						} ) :
						when.reject();
				} );
		}

		var promise = getTemplate()
			.then( function( template ) {
				return bender.files.get( file )
					.then( function( result ) {
						return result ?
							result.read()
							.then( function( content ) {
								return bender.utils.template( template.toString(), {
									SCRIPT: marked( content.toString() )
								} );
							} ) :
							when.reject();
					} );
			} );

		data.parts.push( promise );

		return data;
	}
};
