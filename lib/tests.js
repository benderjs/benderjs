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
	minimatch = require( 'minimatch' ),
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
		function prepareFileList( files, name ) {
			var group = bender.conf.tests[ name ],
				extension = {
					tests: {},
					name: name
				};

			/* istanbul ignore else */
			if ( !group.framework ) {
				extension.framework = bender.conf.framework;
			}

			function isIncluded( file ) {
				return group.include.some( function( pattern ) {
					return pattern.test( file );
				} );
			}

			function isExcluded( file ) {
				return group.exclude.some( function( pattern ) {
					return pattern.test( file );
				} );
			}

			extension.files = files.filter( function( file ) {
				file = path.relative( group.basePath, file.path );

				return !isExcluded( file ) && isIncluded( file );
			} );

			return _.merge( _.cloneDeep( group ), extension );
		}

		// create final group's test array
		function createTests( filelist ) {
			var applications = Array.isArray( filelist.applications ) ?
				filelist.applications : [],
				tests = [];

			_.forOwn( filelist.tests, function( test, id ) {
				test.id = id.replace( /\\/g, '/' );
				test.framework = filelist.framework;
				test.applications = applications;
				test.group = filelist.name;

				tests.push( test );
			} );

			return tests;
		}

		/**
		 * Reads all the files located in bender.conf.basePath and returns an object,
		 * where keys are base paths and values are arrays of files located in those
		 * @return {Object}
		 */
		tests.readBasePaths = function() {
			var files = {};

			// create promises for all base paths
			bender.conf.basePaths.forEach( function( bp ) {
				files[ bp ] = gerard( bp, {
					stats: true
				} );
			} );

			return whenAll( files );
		};

		/**
		 * Build a list of tests found in Bender configuration
		 */
		tests.list = function() {
			var groups = {};

			return tests.readBasePaths()
				.then( function( files ) {
					// create promises for all test groups
					_.forOwn( bender.conf.tests, function( group, name ) {
						groups[ name ] = tests.buildGroup( group, name, files[ group.basePath ] || [] );
					} );

					return whenAll( groups );
				} )
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
		 * @param  {String} name Name of the group
		 * @param  {Array.<Object>} files Array of files found in this group's base path
		 * @return {Promise}
		 */
		tests.buildGroup = function( group, name, files ) {
			var stats = {};

			group = prepareFileList( files, name );

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

			// find a name of the file's group
			groupName = _.findKey( bender.conf.tests, function( group ) {
				var filePath = path.relative( path.resolve( group.basePath ), file );

				function isIncluded( file ) {
					return group.include.some( function( pattern ) {
						return pattern.test( file );
					} );
				}

				function isExcluded( file ) {
					return group.exclude.some( function( pattern ) {
						return pattern.test( file );
					} );
				}

				return !isExcluded( group, filePath ) && isIncluded( filePath );
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
	},

	init: function( done ) {
		var bender = this;

		// build regular expressions from test groups' path patterns
		_.forOwn( bender.conf.tests, function( group ) {
			group.include = [];
			group.exclude = [];

			group.paths.forEach( function( result ) {
				if ( result.charAt( 0 ) === '!' ) {
					group.exclude.push( minimatch.makeRe( result.substr( 1 ) ) );
				} else {
					group.include.push( minimatch.makeRe( result ) );
				}
			} );
		} );

		done();
	}
};
