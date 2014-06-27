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
	recursive = lift( require( 'recursive-readdir' ) ),
	stat = lift( require( 'fs' ).lstat ),

	log = require( './logger' ).create( 'tests', true );

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
		tests.statCache = {};

		/**
		 * Build a list of tests found in Bender configuration
		 */
		tests.list = function() {
			var groups = {};

			// create promises for all test groups
			_.forOwn( bender.conf.tests, function( group, name ) {
				groups[ name ] = tests.buildGroup( _.merge( {
					// use default assertion when none specified in config
					assertion: bender.conf.assertion,
					name: name
				}, group ) );
			} );

			return whenAll( groups )
				.then( function( result ) {
					var joined = [];

					Object.keys( result )
						.sort()
						.forEach( function( name ) {
							joined = joined.concat( result[ name ] );
						} );

					return joined;
				} );
		};

		/**
		 * Build tests for given group
		 * @param  {Object} group Test group object
		 * @return {Promise}
		 */
		tests.buildGroup = function( group ) {
			// get all file paths in given directory
			function getPaths( dir ) {
				if ( dir.charAt( 0 ) === '!' ) {
					return when.resolve( dir );
				}

				return recursive( path.join( group.basePath, dir ) );
			}

			// prepare file list object consumed by test builders
			function prepareFileList( results ) {
				var files = [].concat.apply( [], results ),
					excludes = [],
					pattern;

				results.forEach( function( result ) {
					if ( typeof result == 'string' && result.charAt( 0 ) === '!' ) {
						excludes.push( result.slice( 1 ).replace( /\//g, path.sep ) );
					}
				} );

				// manage exclude paths (the one starting with '!')
				/* istanbul ignore else */
				if ( excludes.length ) {
					pattern = new RegExp( excludes.join( '|' ).replace(/\\/g, '\\\\'), 'i' );

					files = files.filter( function( file ) {
						return !(file.charAt(0) === '!' || pattern.exec( file ));
					} );
				}

				return _.merge( _.cloneDeep( group ), {
					files: files,
					tests: {}
				} );
			}

			// run all the builders with given file list
			function runBuilders( filelist ) {
				return pipeline( bender.testbuilders, filelist );
			}

			// create final group's test array
			function createTests( filelist ) {
				var applications = Array.isArray( group.applications ) ?
					group.applications : [],
					tests = [];

				_.forOwn( filelist.tests, function( test, id ) {
					test.id = id.replace( /\\/g, '/' );
					test.assertion = group.assertion;
					test.applications = applications;
					test.group = group.name;

					tests.push( test );
				} );

				return tests;
			}

			function checkStats( group ) {
				var stats = {};

				group.files.forEach( function( file ) {
					stats[ file ] = stat( file ).then( function( stats ) {
						return +stats.mtime;
					} );
				} );

				return whenAll( stats )
					.then( function( stats ) {
						if ( !tests.statCache[ group.name ] ||
							!_.isEqual( stats, tests.statCache[ group.name ] ) ) {

							tests.statCache[ group.name ] = stats;

							return runBuilders( group )
								.then( createTests )
								.then( function( result ) {

									tests.testsCache[ group.name ] = result;
									return result;
								} );
						} else {
							return tests.testsCache[ group.name ];
						}
					} );
			}

			return when
				.map( group.paths, getPaths )
				.then( prepareFileList )
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
					if ( pth.charAt( 0 ) === '!' ) {
						return;
					}

					paths.push( path.join( group.basePath, pth ) );
				} );

				return paths;
			}

			function isExcluded( group, file ) {
				return group.paths.some( function( pth ) {
					if ( pth.charAt( 0 ) !== '!' ) {
						return false;
					}

					return file.indexOf( path.normalize( pth.substr( 1 ) ) ) > -1;
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

			function prepareFileList( results ) {
				var group = bender.conf.tests[ groupName ],
					extension = {
						tests: {},
						name: groupName
					},
					files = [].concat.apply( [], results ),
					excludes = [],
					pattern;

				/* istanbul ignore else */
				if ( !group.assertion ) {
					extension.assertion = bender.conf.assertion;
				}

				group.paths.forEach( function( dir ) {
					if ( dir.charAt( 0 ) === '!' ) {
						excludes.push( dir.slice( 1 ).replace( /\//g, path.sep ) );
					}
				} );

				/* istanbul ignore else */
				if ( excludes.length ) {
					pattern = new RegExp( excludes.join( '|' ).replace(/\\/g, '\\\\'), 'i' );

					files = files.filter( function( file ) {
						return !(file.charAt(0) === '!' || pattern.exec( file ));
					} );
				}

				extension.files = files;

				return _.merge( _.cloneDeep( group ), extension );
			}

			function runBuilders( filelist ) {
				return pipeline( bender.testbuilders, filelist );
			}

			function createTests( filelist ) {
				var applications = Array.isArray( filelist.applications ) ?
					filelist.applications : [],
					tests = [];

				_.forOwn( filelist.tests, function( test, id ) {
					test.id = id.replace( /\\/g, '/' );
					test.assertion = filelist.assertion;
					test.applications = applications;
					test.group = groupName;

					tests.push( test );
				} );

				return tests;
			}

			function findTest( tests ) {
				var test = _.find( tests, function( test ) {
					return test.id === id;
				} );

				return test;
			}

			return recursive( path.dirname( file ) )
				.then( prepareFileList )
				.then( runBuilders )
				.then( createTests )
				.then( findTest );
		};

		/**
		 * Check if the given file is located in the tests' base paths
		 * @param  {String} file File url
		 * @return {Boolean}
		 */
		tests.checkPath = function( file ) {
			var basePaths = [];

			// create promises for all test groups
			_.forOwn( bender.conf.tests, function( group, name ) {
				/* istanbul ignore else */
				if ( basePaths.indexOf( group.basePath ) === -1 ) {
					basePaths.push( group.basePath );
				}
			} );

			// check if file path starts with one of base paths
			return basePaths.some( function( basePath ) {
				return file.indexOf( basePath ) === 0;
			} );
		};
	}
};
