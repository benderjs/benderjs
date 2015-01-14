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

		tests.testsCache = {};
		tests.statsCache = {};

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

		/**
		 * Build tests for given group
		 * @param  {Object} group Test group object
		 * @param  {String} name Name of the group
		 * @param  {Array.<Object>} files Array of files found in this group's base path
		 * @return {Promise}
		 */
		tests.buildGroup = function( group, name, files ) {
			logger.debug( 'build group', group, name );

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

		tests.list = function() {
			var groups = {};

			_.forOwn( bender.conf.tests, function( group, name ) {
				groups[ name ] = gerard( group.include, {
						ignore: group.exclude,
						stats: true
					} )
					.then( function( files ) {
						return tests.buildGroup( group, name, files );
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
				function isIncluded() {
					return group.include.some( function( pattern ) {
						return minimatch( file, pattern );
					} );
				}

				function isExcluded() {
					return group.exclude.some( function( pattern ) {
						return minimatch( file, pattern );
					} );
				}

				return !isExcluded() && isIncluded();
			} );

			// no group found for this file, means it's not a test
			if ( !groupName ) {
				return when.resolve();
			}

			function handleStat( stats ) {
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
					logger.debug( 'take from the cache', id );
					return test;
					// recreate a group
				} else {
					logger.debug( 'recreate the group', groupName );
					var group = bender.conf.tests[ groupName ];

					return gerard( group.include, {
							ignore: group.exclude,
							stats: true
						} )
						.then( function( files ) {
							return tests.buildGroup( group, groupName, files );
						} )
						.then( function() {
							test = _.find(
								tests.testsCache[ groupName ], {
									id: id
								}
							);

							return test;
						} );
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
		 * Check if the given file is located in on of the test paths
		 * @param  {String} file File url
		 * @return {Boolean}
		 */
		tests.checkPath = function( file ) {
			// check if file path starts with one of base paths
			var result = Object
				.keys( bender.conf.tests )
				.some( function( name ) {
					var group = bender.conf.tests[ name ];

					return group.include.some( function( pattern ) {
						return minimatch( file, pattern );
					} );
				} );

			logger.debug( 'check path', file, result );

			return result;
		};
	},

	init: function( done ) {
		var bender = this;

		// build include and exclude arrays
		_.forOwn( bender.conf.tests, function( group ) {
			group.include = [];
			group.exclude = [];

			group.paths.forEach( function( result ) {
				if ( result.charAt( 0 ) === '!' ) {
					group.exclude.push( result.substr( 1 ) );
				} else {
					group.include.push( result );
				}
			} );

			if ( !group.basePath ) {
				group.basePath = '.';
			}
		} );

		done();
	}
};
