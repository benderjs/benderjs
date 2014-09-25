/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manual test builder, seeks for test's md and html files
 */

'use strict';

var path = require( 'path' ),
	_ = require( 'lodash' );

module.exports = {
	name: 'bender-testbuilder-manual',
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
			test.unit = !!test.js;

			/* istanbul ignore else */
			// clean-up files array
			if ( test.script && ( idx = data.files.indexOf( test.script ) ) > -1 ) {
				data.files.splice( idx, 1 );
			}

			// exclude template.html files from clean-up
			if ( test.html && path.basename( test.html ) !== '__template__.html' &&
				( idx = data.files.indexOf( test.html ) ) > -1 ) {
				data.files.splice( idx, 1 );
			}

		} );

		return data;
	}
};
