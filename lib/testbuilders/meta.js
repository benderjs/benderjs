/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Test meta data builder - parses test's .js file to find the tags
 */

'use strict';

var whenKeys = require( 'when/keys' ),
	_ = require( 'lodash' ),
	patternJS = /\/\*\s*bender\-([\w\-]+)\:([\w\s\-\.\/\\\:\?\+\$@~_,=#%';!]+)([^*]|[\r\n])*\*\//gi,
	patternMD = /@bender\-([\w\-]+)\:([\w \-\.\/\\\:\?\+\$@~_,=#%';!]+)/gi;

/**
 * Find bender-tags comment and return matched tags
 * @param  {Buffer} data File buffer
 * @return {Array.<String>}
 */
function parseMeta( data ) {
	var result = {},
		directive,
		match;

	function buildResult( result, keys, value ) {
		var key = keys.shift();

		if ( keys.length ) {
			if ( !keys[ 0 ] ) {
				return;
			}

			/* istanbul ignore else */
			if ( !result[ key ] ) {
				result[ key ] = {};
			}

			buildResult( result[ key ], keys, value );
		} else {
			result[ key ] = value;
		}
	}

	while ( ( match = patternJS.exec( data ) ) || ( match = patternMD.exec( data ) ) ) {
		directive = match[ 1 ].split( '-' );

		if ( directive.length > 1 ) {
			directive = [ directive.shift(), directive.join( '-' ) ];
		}

		buildResult( result, directive, match[ 2 ].replace( /\s/g, '' ) );
	}

	return result;
}

module.exports = {

	name: 'bender-testbuilder-meta',

	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'conf', 'testbuilders' );

		/**
		 * Add meta tags to tests in given group
		 * @param  {Object} data Group object
		 * @return {Promise}
		 */
		function build( data ) {
			var files = {},
				manuals = {};

			// add meta data to each test in given group object
			function addMeta( result ) {
				_.forOwn( result, function( meta, name ) {
					_.merge( data.tests[ name ], {
						tags: []
					}, meta );
				} );

				return data;
			}

			// convert some of the meta data to arrays
			function convertMeta( data ) {
				_.forOwn( data, function( meta ) {
					_.forOwn( meta, function( value, key ) {
						if ( key === 'tags' || key === 'include' ) {
							meta[ key ] = _.uniq( value.replace( /\s+/g, '' ).split( ',' ) );
						}
					} );
				} );

				return data;
			}

			// merge meta datas
			function mergeMeta( first, second ) {
				first = convertMeta( first );
				second = convertMeta( second );

				_.merge( first, second, function( a, b ) {
					return _.isArray( a ) ? a.concat( b ) : undefined;
				} );

				return first;
			}

			// create a promise for given test files
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

			return whenKeys
				.all( files )
				.then( function( files ) {
					return whenKeys
						.all( manuals )
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
