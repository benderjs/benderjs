'use strict';

/**
 * @file Default test builder, seeks for test's html and js files
 */

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

		if ( ext === '.js' ) {
			tests[ id ].js = file;
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

		// clean-up files array
		if ( test.js && ( idx = data.files.indexOf( test.js ) ) > -1 ) {
			data.files.splice( idx, 1 );
		}

		// exclude template.html files from clean-up
		if ( test.html && path.basename( test.html ) !== 'template.html' &&
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
		bender.testbuilders.unshift( builder.build );
	}
};
