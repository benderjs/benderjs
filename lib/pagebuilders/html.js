/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for a test's HTML file
 */

'use strict';

var path = require( 'path' );

module.exports = {
	name: 'bender-pagebuilder-html',
	build: function( data ) {
		var bender = this,
			file;

		if ( !data.html ) {
			return data;
		}

		file = data.snapshot ? path.join( '.bender/jobs/', data.jobId, '/tests/', data.html ) : data.html;

		data.parts.push( bender.files.readString( file ) );

		return data;
	},
	attach: function() {
		this.pagebuilders.add( 'html', module.exports.build, 999 );
	}
};
