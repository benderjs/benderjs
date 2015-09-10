/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manual test builder, seeks for test's MD and HTML files
 */

'use strict';

var path = require( 'path' ),
	_ = require( 'lodash' );

/**
 * @module testbuilders/manual
 */
module.exports = {
	name: 'bender-testbuilder-manual',

	/**
	 * Build manual tests for the given group
	 * @param  {Object} data Group object
	 * @return {Object}
	 */
	build: function( data ) {
		var tests = {};

		data.files.forEach( function( file ) {
			var ext = path.extname( file ),
				id = file.split( ext )[ 0 ];

			if ( !tests[ id ] ) {
				tests[ id ] = {
					id: id
				};
			}

			if ( ext === '.md' ) {
				tests[ id ].script = file;
			}

			if ( ext === '.html' || ext === '.htm' ) {
				tests[ id ].html = file;
			}
		} );

		_.each( tests, function( test, id ) {
			var idx;

			if ( !test.script ) {
				return;
			}

			data.tests[ id ] = _.merge( data.tests[ id ] || {}, test );

			test = data.tests[ id ];

			test.manual = true;
			test.unit = false;

			/* istanbul ignore else */
			// clean-up the files array
			if ( test.script && ( idx = data.files.indexOf( test.script ) ) > -1 ) {
				data.files.splice( idx, 1 );
			}

			// exclude __template__.html files from the clean-up process
			if ( test.html && path.basename( test.html ) !== '__template__.html' &&
				( idx = data.files.indexOf( test.html ) ) > -1 ) {
				data.files.splice( idx, 1 );
			}
		} );

		return data;
	}
};
