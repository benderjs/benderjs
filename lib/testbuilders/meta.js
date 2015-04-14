/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Test meta data builder - parses a test's .js file to find test directives
 */

'use strict';

var whenKeys = require( 'when/keys' ),
	_ = require( 'lodash' ),
	pattern = /(?:\/\*\s*|\@)bender-(\w+(?:\-\w+)*)\:([^\*\n$]+)/gi;

/**
 * Find test directives and return them
 * @param  {Buffer} data File buffer
 * @return {Object}
 */
function parseMeta( data ) {
	var result = {},
		directive,
		current,
		parent,
		value,
		match;

	// process all matching directives (bender-<namepath>: <value>)
	while ( ( match = pattern.exec( data ) ) ) {
		directive = match[ 1 ].split( '-' );
		value = match[ 2 ].trim();

		parent = result;

		// process a directive's name path
		while ( ( current = directive.shift() ) && directive.length ) {
			if ( !parent[ current ] ) {
				parent[ current ] = {};
			}

			parent = parent[ current ];
		}

		// if there was a previous value, add the new one after a coma
		parent[ current ] = parent[ current ] ? parent[ current ] + ', ' + value : value;
	}

	return result;
}

module.exports = {

	name: 'bender-testbuilder-meta',

	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'conf', 'testbuilders' );

		/**
		 * Add meta tags to tests in the given group
		 * @param  {Object} data Group object
		 * @return {Promise}
		 */
		function build( data ) {
			var files = {},
				manuals = {};

			// add meta data to each test in the group object
			function addMeta( result ) {
				_.forOwn( result, function( meta, name ) {
					_.merge( data.tests[ name ], {
						tags: []
					}, meta );
				} );

				return data;
			}

			// convert "tags" and "incldue" meta data to arrays
			function convertMeta( data ) {
				_.forOwn( data, function( meta ) {
					_.forOwn( meta, function( value, key ) {
						if ( key === 'tags' || key === 'include' ) {
							meta[ key ] = _.uniq( value.trim().split( /\s*,\s*/ ) );
						}
					} );
				} );

				return data;
			}

			// merge two meta data objects
			function mergeMeta( first, second ) {
				first = convertMeta( first );
				second = convertMeta( second );

				_.merge( first, second, function( a, b ) {
					return _.isArray( a ) ? a.concat( b ) : undefined;
				} );

				return first;
			}

			// create promises for the test files
			_.forOwn( data.tests, function( test, name ) {
				if ( test.unit ) {
					files[ name ] = bender.files.readString( test.js )
						.then( parseMeta );
				}

				if ( test.manual ) {
					manuals[ name ] = bender.files.readString( test.script )
						.then( parseMeta );
				}
			} );

			return whenKeys.all( files )
				.then( function( files ) {
					return whenKeys.all( manuals )
						.then( function( manuals ) {
							return mergeMeta( files, manuals );
						} );
				} )
				.then( addMeta );
		}

		module.exports.build = build;

		bender.testbuilders.add( 'meta', build );
	}
};
