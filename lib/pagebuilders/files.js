/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for adding extra .js and .css files.
 */

'use strict';

/**
 * @module pagebuilders/files
 */
module.exports = {
	name: 'bender-pagebuilder-files',

	/**
	 * Include resources - scripts and stylesheets - in a test page
	 * @param  {Object} data Test page data
	 * @return {Object}
	 */
	build: function( data ) {
		var chunks = {
				head: [ '<head>' ],
				body: [ '<body>' ]
			};

		data.files.css.forEach( function( file ) {
			chunks[ file.options.body ? 'body' : 'head' ]
				.push( '<link rel="stylesheet" href="', file.url, '">' );
		} );

		data.files.js.forEach( function( file ) {
			chunks[ file.options.body ? 'body' : 'head' ]
				.push( '<script src="', file.url, '"></script>' );
		} );

		data.files.code.forEach( function ( item ) {
			chunks[ item.options.body ? 'body' : 'head' ]
				.push( item.code );
		} );

		if ( chunks.head.length > 1 ) {
			chunks.head.push( '</head>' );
			data.parts.push( chunks.head.join( '' ) );
		}

		if ( chunks.body.length > 1 ) {
			chunks.body.push( '</body>' );
			data.parts.push( chunks.body.join( '' ) );
		}

		return data;
	},

	attach: function() {
		// add this one as the very-very last
		this.pagebuilders.add( 'files', module.exports.build, Number.MAX_VALUE );
	}
};
