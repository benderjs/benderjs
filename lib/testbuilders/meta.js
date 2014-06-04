/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Test meta data builder - parses test's .js file to find the tags
 */

'use strict';

var whenNode = require( 'when/node' ),
	whenKeys = require( 'when/keys' ),
	fs = require( 'fs' ),
	_ = require( 'lodash' ),
	pattern = /\/\*\s*bender\-tags\:([\w\s,]+)([^*]|[\r\n])*\*\//i,
	builder;

/**
 * Find bender-tags comment and return matched tags
 * @param  {Buffer} data File buffer
 * @return {Array.<String>}
 */
function parseMeta( data ) {
	var match = pattern.exec( data.toString() );

	return match ? match[ 1 ].replace( /\s/g, '' ).split( ',' ) : [];
}

module.exports = builder = {

	name: 'bender-testbuilder-meta',

	attach: function() {
		var bender = this;

		bender.checkDeps( builder.name, 'testbuilders' );

		/**
		 * Add meta tags to tests in given group
		 * @param  {Object} data Group object
		 * @return {Promise}
		 */
		builder.build = function( data ) {
			var files = {};

			// add tags to tests in given group object
			function addTags( result ) {
				_.forOwn( result, function( tags, name ) {
					var nameTags = name.split( '/' ).slice( 0, -1 ),
						filteredTags;

					if ( !bender.conf.needsBasePath ) {
						nameTags = nameTags.slice( 1 );
					}

					filteredTags = tags.filter( function( tag ) {
						return nameTags.indexOf( tag ) === -1;
					} );

					data.tests[ name ].tags = nameTags.concat( filteredTags );
				} );

				return data;
			}

			// create a promise for given test
			function makePromise( test, name ) {
				files[ name ] = whenNode
					.call( fs.readFile, test.js )
					.then( parseMeta );
			}

			_.forOwn( data.tests, makePromise );

			return whenKeys
				.all( files )
				.then( addTags );
		};

		bender.testbuilders.push( builder.build );
	}
};
