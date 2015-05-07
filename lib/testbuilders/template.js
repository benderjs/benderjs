/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Adds __template__.html as a test's HTML source if no HTML file was provided
 */

'use strict';

var path = require( 'path' );

/**
 * @module testbuilders/template
 */
module.exports = {
	name: 'bender-testbuilder-template',

	/**
	 * Search for template files for tests without HTML or JS
	 * @param  {Object} data Group object
	 * @return {Object}
	 */
	build: function( data ) {
		Object.keys( data.tests ).forEach( function( id ) {
			var test = data.tests[ id ],
				tpl;

			// in manual test that doesn't contain its own script file...
			if ( test.manual && !test.js ) {
				if ( test.template && typeof test.template == 'object' && test.template.js ) {
					// ... use template set in bender directive if it was defined
					tpl = path.join( path.dirname( id ), test.template.js );
				} else {
					// ... use __template__.js if the directive wasn't defined
					tpl = path.join( path.dirname( id ), '__template__.js' );
				}

				// ... but only if the template exist
				if ( data.files.indexOf( tpl ) > -1 ) {
					test.js = tpl;
				}
			}

			if ( test.html ) {
				return;
			}

			if ( test.template && typeof test.template == 'object' && test.template.html ) {
				tpl = path.join( path.dirname( id ), test.template.html );
			} else {
				tpl = path.join( path.dirname( id ), '__template__.html' );
			}

			/* istanbul ignore else */
			if ( data.files.indexOf( tpl ) > -1 ) {
				test.html = tpl;
			}
		} );

		return data;
	},

	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'testbuilders' );

		bender.testbuilders.add( 'template', module.exports.build );
	}
};
