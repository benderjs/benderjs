/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Test meta data builder - parses test's .js file to find the tags
 */

'use strict';

var whenNode = require( 'when/node' ),
	whenKeys = require( 'when/keys' ),
	fs = require( 'graceful-fs' ),
	_ = require( 'lodash' ),
	patternJS = /\/\*\s*bender\-([\w\-]+)\:([\w\s\-\.\/\\\:\?\+\$@~_,=#%';!]+)([^*]|[\r\n])*\*\//gi,
	patternMD = /@bender\-([\w\-]+)\:([\w \-\.\/\\\:\?\+\$@~_,=#%';!]+)/gi,
	builder;

/**
 * Find bender-tags comment and return matched tags
 * @param  {Buffer} data File buffer
 * @return {Array.<String>}
 */
function parseMeta( data ) {
	var result = {},
		directive,
		match;

	data = data.toString();

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

module.exports = builder = {

	name: 'bender-testbuilder-meta',

	attach: function() {
		var bender = this;

		bender.checkDeps( builder.name, 'conf', 'testbuilders' );

		/**
		 * Add meta tags to tests in given group
		 * @param  {Object} data Group object
		 * @return {Promise}
		 */
		builder.build = function( data ) {
			var files = {};

			// add meta data to each test in given group object
			function addMeta( result ) {
				_.forOwn( result, function( meta, name ) {
					_.forOwn( meta, function( value, key ) {
						if ( key === 'tags' ) {
							value = _.uniq( value.split( ',' ) );
						}

						data.tests[ name ][ key ] = value;
					} );

					if ( !data.tests[ name ].tags ) {
						data.tests[ name ].tags = [];
					}
				} );

				return data;
			}

			// create a promise for given test
			function makePromise( test, name ) {
				files[ name ] = whenNode
				// TODO make it better and merge results from both files
				.call( fs.readFile, test.js || test.script )
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
