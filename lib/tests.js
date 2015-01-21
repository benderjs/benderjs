/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages tests
 */

'use strict';

var _ = require( 'lodash' ),
	path = require( 'path' ),
	fs = require( 'graceful-fs' ),
	url = require( 'url' ),
	when = require( 'when' ),
	minimatch = require( 'minimatch' ),
	pipeline = require( 'when/pipeline' ),
	whenAll = require( 'when/keys' ).all,
	lift = require( 'when/node' ).lift,
	gerard = lift( require( 'gerard' ) ),
	stat = lift( fs.lstat ),
	logger = require( './logger' ).create( 'tests', true );

/**
 * @module tests
 */
module.exports = {

	name: 'tests',

	/**
	 * Attach module to Bender
	 */
	attach: function() {
		logger.debug( 'attach' );

		var bender = this,
			tests = bender.tests = {};

		bender.checkDeps( module.exports.name, 'plugins', 'conf' );

		// cache for the test groups
		tests.testsCache = {};

		// cache for the file stats
		tests.statsCache = {};

		// cache for the minimatch instances
		tests.minimatchCache = {};

		/**
		 * Build tests for given group
		 * @param  {Object} group Test group object
		 * @param  {String} name Name of the group
		 * @param  {Array.<Object>} files Array of files found in this group's base path
		 * @return {Promise}
		 */
		tests.buildGroup = function( name, files ) {
			logger.debug( 'build a group', name );

			var stats = {},
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
		 * List all the tests
		 * @return {Promise}
		 */
		tests.list = function() {
			var groups = {};

			_.forOwn( bender.conf.tests, function( group, name ) {
				groups[ name ] = gerard(
						group.include, {
							ignore: group.exclude,
							stats: true
						}
					)
					.then( function( files ) {
						return tests.buildGroup( name, files );
					} );
			} );

			function joinResults( result ) {
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
			}

			return whenAll( groups )
				.then( joinResults );
		};

		/**
		 * Get test for given id
		 * @param  {String} id Test id
		 * @return {Promise}
		 */
		tests.get = function( id ) {
			logger.debug( 'get', id );

			var file = url.parse( id ).pathname + '.js',
				groupName;

			// file is not located in any of the tests' base paths
			if ( !tests.checkPath( file ) ) {
				return when.resolve();
			}

			file = path.normalize( file );

			// find a name of the file's group
			groupName = _.findKey( bender.conf.tests, function( group ) {
				var match = isMatching.bind( null, file );

				return !group.exclude.some( match ) && group.include.some( match );
			} );

			// no group found for this file, means it's not a test
			if ( !groupName ) {
				return when.resolve();
			}

			function handleStat( stats ) {
				var test;

				// find a test in the cache
				function findTest() {
					return _.find( tests.testsCache[ groupName ], {
						id: id
					} );
				}

				// take the test's data from the cache
				if ( tests.statsCache[ groupName ] &&
					tests.statsCache[ groupName ][ file ] === +stats.mtime &&
					tests.testsCache[ groupName ] &&
					( test = findTest() )
				) {
					logger.debug( 'take the test "%s" from the cache', id );

					return test;
					// recreate the test's group
				} else {
					logger.debug( 'recreate the group', groupName );

					var group = bender.conf.tests[ groupName ];

					return gerard(
							group.include, {
								ignore: group.exclude,
								stats: true
							}
						)
						.then( function( files ) {
							return tests.buildGroup( groupName, files );
						} )
						.then( findTest );
				}
			}

			// TODO make it better
			return stat( file )
				.then( handleStat, function() {
					// check if it isn't a manual test
					return stat( url.parse( id ).pathname + '.md' )
						.then( handleStat, /* istanbul ignore next */ function() {
							return when.resolve();
						} );
				} );
		};

		/**
		 * Check if the given file is located in one of the test paths
		 * @param  {String} file File path
		 * @return {Boolean}
		 */
		tests.checkPath = function( file ) {
			function match( path ) {
				return isPattern( path ) ?
					minimatch( file, path ) :
					file.indexOf( path ) === 0;
			}

			var result = Object.keys( bender.conf.tests )
				.some( function( name ) {
					var group = bender.conf.tests[ name ];

					// check if the file path starts with one of the group's base paths
					return group.basePaths.some( match ) ||
						// or starts with the group's base path
						group.basePath !== '.' && file.indexOf( group.basePath ) === 0;
				} );

			logger.debug( 'check path', file, result );

			return result;
		};

		/**
		 * Returns a list of basePaths for the given test group name
		 * @param  {String} name Name of a test group
		 * @return {Promise}
		 */
		tests.getBasePaths = function( name ) {
			var group = bender.conf.tests[ name ];

			if ( !group ) {
				return when.reject( 'There\'s no group: ' + name );
			}

			function mergeResults( results ) {
				return Array.prototype.concat.apply( [], results );
			}

			var basePaths = group.basePaths.map( function( bp ) {
				if ( isPattern( bp ) ) {
					return gerard(
							group.basePath, {
								dirOnly: true,
								recursive: false
							}
						)
						.then( function( folders ) {
							return folders.filter( function( folder ) {
									return isMatching( folder + '/', bp );
								} )
								.map( function( folder ) {
									return folder.replace( /\\/g, '/' );
								} );
						} );

				} else {
					return bp;
				}
			} );

			return when.all( basePaths )
				.then( mergeResults );
		};

		// check if the given string contains a pattern
		function isPattern( str ) {
			return str.indexOf( '*' ) > -1;
		}

		// check if the given file path matches the pattern, also cache patterns for further reuse
		function isMatching( file, pattern ) {
			var mm = tests.minimatchCache[ pattern ];

			// store the minimatch instance in the cache for reuse
			if ( !mm ) {
				mm = tests.minimatchCache[ pattern ] = new minimatch.Minimatch( pattern );
			}

			return mm.match( file );
		}


		// run all the builders with given file list
		function runBuilders( filelist ) {
			return pipeline( bender.testbuilders.list(), filelist );
		}

		// prepare file list object consumed by test builders
		function prepareFileList( files, name ) {
			var group = bender.conf.tests[ name ],
				extension = {
					files: files,
					name: name,
					tests: {}
				};

			/* istanbul ignore else */
			if ( !group.framework ) {
				extension.framework = bender.conf.framework;
			}

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
	},

	init: function( done ) {
		var bender = this;

		// build include, exclude and basePaths arrays
		_.forOwn( bender.conf.tests, function( group ) {
			group.include = [];
			group.exclude = [];
			group.basePaths = [];

			// set a default base path if none specified
			if ( !group.basePath ) {
				group.basePath = '.';
			}

			// collect include and exclude paths
			group.paths.forEach( function( result ) {
				// it's an exclusion pattern
				if ( result.charAt( 0 ) === '!' ) {
					group.exclude.push( result.substr( 1 ) );
				} else {
					result = path.join( group.basePath, result ).replace( /\\/g, '/' );
					group.include.push( result );
				}
			} );

			// use included paths whe using the default one
			if ( group.basePath === '.' ) {
				group.basePaths = group.basePaths.concat( group.include );
				// use the basePath only
			} else {
				group.basePaths.push( group.basePath );
			}
		} );

		done();
	}
};