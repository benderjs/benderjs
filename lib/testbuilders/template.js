/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Adds __template__.html as test's HTML source if no html file specified
 */

'use strict';

var path = require( 'path' ),
	_ = require( 'lodash' ),
	builder;

/**
 * Default test build for given group
 * @param  {Object} data Group object
 * @return {Object}
 */
function build( data ) {
	Object.keys( data.tests ).forEach( function( id ) {
		var test = data.tests[ id ],
			tpl;

		// include __template__.js file if found in the test's directory
		if ( data.files.indexOf( path.join( id, '../__template__.js' ).replace( /\\/g, '/' ) ) > -1 ) {
			if ( !test.include ) {
				test.include = [];
			}

			test.include.push( '%TEST_DIR%__template__.js' );

			test.include = _.uniq( test.include );
		}

		if ( test.html ) {
			return;
		}

		tpl = path.join( path.dirname( id ), '__template__.html' ).replace( /\\/g, '/' );

		/* istanbul ignore else */
		if ( data.files.indexOf( tpl ) > -1 ) {
			test.html = tpl;
		}
	} );

	return data;
}

module.exports = builder = {

	name: 'bender-testbuilder-template',
	build: build,

	attach: function() {
		var bender = this;

		bender.checkDeps( builder.name, 'testbuilders' );

		bender.testbuilders.push( builder.build );
	}
};
