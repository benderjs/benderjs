/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages tests
 */

'use strict';

var _ = require( 'lodash' ),
	path = require( 'path' ),
	url = require( 'url' ),
	when = require( 'when' ),
	pipeline = require( 'when/pipeline' ),
	whenAll = require( 'when/keys' ).all,
	lift = require( 'when/node' ).lift,
	gerard = lift( require( 'gerard' ) ),
	stat = lift( require( 'fs' ).lstat );

/**
 * @module tests
 */
module.exports = {

	name: 'tests',

	/**
	 * Attach module to Bender
	 */
	attach: function() {
		var bender = this,
			tests = bender.tests = {};

		bender.checkDeps( module.exports.name, 'plugins', 'conf' );

		tests.testsCache = {};
		tests.statsCache = {};

		// run all the builders with given file list
		function runBuilders( filelist ) {
			return pipeline( bender.testbuilders, filelist );
		}

		// prepare file list object consumed by test builders
		function prepareFileList( results, name ) {
			var group = bender.conf.tests[ name ],
				files = [].concat.apply( [], results ),
				extension = {
					tests: {},
					name: name
				},
				excludes = [],
				pattern;

			/* istanbul ignore else */
			if ( !group.assertion ) {
				extension.assertion = bender.conf.assertion;
			}

			group.paths.forEach( function( result ) {
				if ( result.charAt( 0 ) === '!' ) {
					excludes.push( result.slice( 1 ).replace( /\//g, path.sep ) );
				}
			} );

			// manage exclude paths (the one starting with '!')
			/* istanbul ignore else */
			if ( excludes.length ) {
				pattern = new RegExp( excludes.join( '|' ).replace( /\\/g, '\\\\' ), 'i' );

				files = files.filter( function( file ) {
					return !( !file || pattern.exec( file.path ) );
				} );
			}

			extension.files = files;

			return _.merge( _.cloneDeep( group ), extension );
		}

		// create final group's test array
		function createTests( filelist ) {
			var applications = Array.isArray( filelist.applications ) ?
				filelist.applications : [],
				tests = [];

			_.forOwn( filelist.tests, function( test, id ) {
				test.id = id.replace( /\\/g, '/' );
				test.assertion = filelist.assertion;
				test.applications = applications;
				test.group = filelist.name;

				tests.push( test );
			} );

			return tests;
		}

		/**
		 * Build a list of tests found in Bender configuration
		 */
		tests.list = function() {
			var groups = {};

			// create promises for all test groups
			_.forOwn( bender.conf.tests, function( group, name ) {
				groups[ name ] = tests.buildGroup( group, name );
			} );

			return whenAll( groups )
				.then( function( result ) {
					var joined = [];

					Object.keys( result )
						.sort()
						.forEach( function( name ) {
							joined = joined.concat( result[ name ] );
						} );

					return joined.sort( function( prev, next ) {
						/* istanbul ignore next */
						// sort by group name
						return prev.group > next.group ? 1 : prev.group < next.group ? -1 :
							// sort by test id
							prev.id > next.id ? 1 : prev.id < next.id ? -1 : 0;
					} );
				} );
		};

		/**
		 * Build tests for given group
		 * @param  {Object} group Test group object
		 * @return {Promise}
		 */
		tests.buildGroup = function( group, name ) {
			// get all file paths in given directory
			function getPaths( dir ) {
				// do not search for files in excluded path
				if ( dir.charAt( 0 ) === '!' ) {
					return when.resolve();
				}

				return gerard( path.join( group.basePath, dir ), {
					stats: true
				} );
			}

			function checkStats( group ) {
				var stats = {};

				group.files.forEach( function( file ) {
					stats[ file.path ] = +file.stats.mtime;
				} );

				if ( !tests.statsCache[ group.name ] ||
					!_.isEqual( stats, tests.statsCache[ group.name ] ) ) {

					tests.statsCache[ group.name ] = stats;

					group.files = group.files.map( function( file ) {
						return file.path;
					} );

					return runBuilders( group )
						.then( createTests )
						.then( function( result ) {
							tests.testsCache[ group.name ] = result;

							return result;
						} );
				} else {
					return when.resolve( tests.testsCache[ group.name ] );
				}
			}

			return when
				.map( group.paths, getPaths )
				.then( function( results ) {
					return prepareFileList( results, name );
				} )
				.then( checkStats );
		};

		/**
		 * Get test for given id
		 * @param  {String} id Test id
		 * @return {Promise}
		 */
		tests.get = function( id ) {
			var file = url.parse( id ).pathname + '.js',
				groupName;

			// file is not located in any of the tests' base paths
			if ( !tests.checkPath( file ) ) {
				return when.resolve();
			}

			file = path.normalize( file );

			function getGroupPaths( group ) {
				var paths = [];

				group.paths.forEach( function( pth ) {
					if ( pth.charAt( 0 ) !== '!' ) {
						paths.push( path.join( group.basePath, pth ) );
					}
				} );

				return paths;
			}

			function isExcluded( group, file ) {
				return group.paths.some( function( pth ) {
					return pth.charAt( 0 ) === '!' && file.indexOf( path.normalize( pth.substr( 1 ) ) ) > -1;
				} );
			}

			groupName = _.findKey( bender.conf.tests, function( group ) {
				return getGroupPaths( group ).some( function( groupPath ) {
					return file.indexOf( groupPath ) === 0 && !isExcluded( group, file );
				} );
			} );

			// no group found for this file, means it's not a test
			if ( !groupName ) {
				return when.resolve();
			}

			function findTest( tests ) {
				var test = _.find( tests, {
					id: id
				} );

				return test;
			}

			return stat( file ).then( function( stats ) {
				var test;

				// take the data from the cache
				if ( tests.statsCache[ groupName ] &&
					tests.statsCache[ groupName ][ file ] === +stats.mtime &&
					tests.testsCache[ groupName ] &&
					( test = _.find(
						tests.testsCache[ groupName ], {
							id: id
						}
					) )
				) {
					return test;
					// build the data
				} else {
					return gerard(
							path.dirname( file ), {
								stats: true
							}
						)
						.then( function( results ) {
							return prepareFileList( results, groupName );
						} )
						.then( function( group ) {
							group.files = group.files.map( function( file ) {
								return file.path;
							} );

							return group;
						} )
						.then( runBuilders )
						.then( createTests )
						.then( findTest );
				}
			} );
		};

		/**
		 * Check if the given file is located in the tests' base paths
		 * @param  {String} file File url
		 * @return {Boolean}
		 */
		tests.checkPath = function( file ) {
			// check if file path starts with one of base paths
			return bender.conf.basePaths.some( function( basePath ) {
				return file.indexOf( basePath ) === 0;
			} );
		};
	}
};
