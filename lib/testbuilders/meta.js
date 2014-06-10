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
	pattern = /\/\*\s*bender\-([\w\-]+)\:([\w\s,]+)([^*]|[\r\n])*\*\//gi,
	builder;

/**
 * Find bender-tags comment and return matched tags
 * @param  {Buffer} data File buffer
 * @return {Array.<String>}
 */
function parseMeta( data ) {
	var result = {},
		value,
		match,
		path;

	data = data.toString();

	function buildResult( result, keys, value ) {
		var key = keys.shift();

		if ( !key ) {
			return;
		}

		if ( keys.length ) {
			if ( !result[ key ] ) {
				result[ key ] = {};
			}
			buildResult( result[ key ], keys, value );
		} else {
			result[ key ] = value;
		}
	}

	while ( ( match = pattern.exec( data ) ) ) {
		path = match[ 1 ].split( '-' );

		if ( path.length > 1 ) {
			path = [ path.shift(), path.join( '-' ) ];
		}

		buildResult( result, path, match[ 2 ].replace( /\s/g, '' ) );
	}

	return result;
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

			// build unique tags from tags in test file and test's id
			function addTags( tags, name ) {
				// build tags from the ID
				var nameTags = name.split( '/' ).slice( 0, -1 ),
					uniqueTags;

				// strip the base path if it's not needed
				if ( !bender.conf.needsBasePath ) {
					nameTags = nameTags.slice( 1 );
				}

				// remove duplicate entries
				nameTags = _.uniq( nameTags );

				// filter unique tags
				uniqueTags = tags.split( ',' ).filter( function( tag ) {
					return nameTags.indexOf( tag ) === -1;
				} );

				return nameTags.concat( uniqueTags );
			}

			// add meta data to each test in given group object
			function addMeta( result ) {
				_.forOwn( result, function( meta, name ) {
					_.forOwn( meta, function( value, key ) {
						if ( key === 'tags' ) {
							value = addTags( value, name );
						}

						data.tests[ name ][ key ] = value;
					} );
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
				.then( addMeta );
		};

		bender.testbuilders.push( builder.build );
	}
};
