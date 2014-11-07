/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Adds __template__.html as test's HTML source if no html file specified
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
	Object.keys( data.tests ).forEach( function( id ) {
		var test = data.tests[ id ],
			tpl;

		// use __template__.js for manual tests without their own script files
		if (
			test.manual &&
			!test.js &&
			data.files.indexOf( ( tpl = path.join( id, '../__template__.js' ) ) ) > -1 ) {
			test.template = tpl;
		}

		if ( test.html ) {
			return;
		}

		tpl = path.join( path.dirname( id ), '__template__.html' );

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
