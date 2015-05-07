/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for a test's script
 */

'use strict';

var path = require( 'path' );

/**
 * @module pagebuilders/script
 */
module.exports = {
	name: 'bender-pagebuilder-script',
	/**
	 * Include a test script in a test page
	 * @param  {Object} data Test page data
	 * @return {Object}
	 */
	build: function( data ) {
		var bender = this,
			script = data.js;

		if ( !script ) {
			return data;
		}

		var file = data.snapshot ? path.join( '.bender/jobs/', data.jobId, '/tests/', script ) : script;

		data.parts.push( bender.files.readString( file ).then( function( script ) {
			return '<script>\n(function (bender) {\n' + script +
				'\n})(window.bender || {});\n</script>';
		} ) );

		return data;
	},

	attach: function() {
		var priority = this.pagebuilders.getPriority( 'html' );

		// add this one right after the HTML page builder
		this.pagebuilders.add( 'script', module.exports.build, priority );
	}
};
