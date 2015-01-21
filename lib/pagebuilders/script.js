/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for tests script
 */

'use strict';

var path = require( 'path' );

module.exports = {
	name: 'bender-pagebuilder-script',
	build: function( data ) {
		var bender = this,
			script = data.js || data.template;

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

		this.pagebuilders.add( 'script', module.exports.build, priority );
	}
};
