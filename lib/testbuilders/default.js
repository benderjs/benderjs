/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Default test builder, seeks for test's html and js files
 */

'use strict';

var path = require( 'path' ),
	builder;

/**
 * Default test build for given group
 * @param  {Object} data Group object
 * @return {Object}
 */
function build( data ) {
	var tests = {};

	// build test tree
	data.files.forEach( function( file ) {
		var ext = path.extname( file ),
			id = file.split( ext )[ 0 ];

		if ( !tests[ id ] ) {
			tests[ id ] = {
				id: id
			};
		}

		// exclude __template__.js scripts
		if ( ext === '.js' && path.basename( file ) !== '__template__.js' ) {
			tests[ id ].js = file;
			tests[ id ].unit = true;
		}

		if ( ext === '.html' || ext === '.htm' ) {
			tests[ id ].html = file;
		}
	} );

	// parse test tree and modify group object
	Object.keys( tests ).forEach( function( id ) {
		var test = tests[ id ],
			idx;

		if ( !test.js ) {
			return;
		}

		data.tests[ id ] = test;

		/* istanbul ignore else */
		// clean-up files array
		if ( test.js && ( idx = data.files.indexOf( test.js ) ) > -1 ) {
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

module.exports = builder = {

	name: 'bender-testbuilder-default',
	build: build,

	attach: function() {
		var bender = this;

		bender.checkDeps( builder.name, 'testbuilders' );

		// add the default builder at the beginning
		bender.testbuilders.add( 'default', builder.build, -1 );
	}
};
