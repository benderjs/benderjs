/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages tests
 */

'use strict';

var _ = require( 'lodash' ),
	path = require( 'path' ),
	glob = require( 'glob' ),
	watch = require( 'node-watch' ),
	when = require( 'when' ),
	whenAll = require( 'when/keys' ).all,
	whenCall = require( 'when/node' ).call,
	pipeline = require( 'when/pipeline' ),
	Datastore = require( 'nedb' ),

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
			tests = bender.tests = {},
			isRebuilding = false,
			waitingForRebuild = false,
			db;

		bender.checkDeps( module.exports.name, 'testbuilders', 'cache', 'conf' );

		tests.db = db = new Datastore( {
			// TODO
			// inMemoryOnly mode for now
			// filename: path.join(process.cwd(), '.bender/tests.db'),
			// autoload: true
		} );

		_.bindAll( db );

		/**
		 * Array of test file paths that should be accessible via HTTP Server
		 * @type {Array}
		 */
		tests.files = [];

		/**
		 * Start file system watcher for given configuration
		 */
		tests.watch = function() {
			var paths = Object.keys( bender.conf.tests )
				.reduce( function( result, name ) {
					var dir = bender.conf.tests[ name ].basePath;

					if ( result.indexOf( dir ) === -1 ) {
						result.push( dir );
					}

					return result;
				}, [] );

			try {
				watch( paths, {
					followSymLinks: true
				}, tests.rebuild );
			} catch ( e ) {
				if ( e.code === 'ENOSPC' ) {
					log.error( 'Maximum number of files watched exceeded, try increasing it with:' );
					log.error( 'echo <number> | sudo tee /proc/sys/fs/inotify/max_user_watches' );
					process.exit( 1 );
				} else if ( e.code === 'EMFILE' ) {
					log.error( 'Maximum number of opened files exceeded, try increasing it with:' );
					log.error( 'ulimit -n <number>' );
				} else {
					throw e;
				}
			}
		};

		/**
		 * Rebuild the tests database
		 */
		tests.rebuild = function() {
			log.info( 'rebuilding tests' );

			if ( isRebuilding ) {
				waitingForRebuild = true;
				return;
			}

			isRebuilding = true;

			db.remove( {}, {
				multi: true
			}, function( err ) {
				if ( err ) {
					return log.error( 'error while cleaning tests database:', err );
				}

				tests.files = [];

				bender.cache
					.clear()
					.done( tests.build );
			} );
		};

		/**
		 * Collects paths to test files and assets to be accesible via HTTP server
		 * @return {Promise}
		 */
		tests.buildSafePaths = function() {
			var basePaths = [];

			function getPaths( basePath ) {
				return whenCall(
					glob,
					path.join( basePath, '**/*' ), {
						cwd: process.cwd()
					}
				).then( function( paths ) {
					tests.files = tests.files.concat( paths );
				} );
			}

			_.forOwn( bender.conf.tests, function( group ) {
				if ( basePaths.indexOf( group.basePath ) == -1 ) {
					basePaths.push( group.basePath );
				}
			} );

			return when.map( basePaths, getPaths );
		};

		/**
		 * Build tests found in Bender configuration
		 */
		tests.build = function() {
			var groups = {};

			tests.ready = false;

			// create promises for all test groups
			_.forOwn( bender.conf.tests, function( group, name ) {
				groups[ name ] = tests.buildGroup( _.merge( {
					// use default assertion when none specified in config
					assertion: bender.conf.assertion,
					name: name
				}, group ) );
			} );

			whenAll( groups )
				.then( function() {
					return tests.buildSafePaths();
				} )
				.done( function() {
					tests.ready = true;
					isRebuilding = false;
					log.info( 'rebuilt' );

					if ( waitingForRebuild ) {
						waitingForRebuild = false;
						tests.rebuild();
					}
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

				return whenCall(
					glob,
					dir.slice( -1 ) === '/' ?
					path.join( group.basePath, dir, '**/*.*' ) : dir, {
						cwd: process.cwd()
					}
				);
			}

			// prepare file list object consumed by test builders
			function prepareFileList( results ) {
				var files = [].concat.apply( [], results ),
					excludes = [],
					pattern;

				results.forEach( function( result ) {
					if ( typeof result == 'string' && result.charAt( 0 ) === '!' ) {
						excludes.push( result.slice( 1 ) );
					}
				} );

				// manage exclude paths (the one starting with '!')
				if ( excludes.length ) {
					pattern = new RegExp( excludes.join( '|' ), 'i' );

					files = files.filter( function( file ) {
						return !pattern.exec( file );
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

			// create final group object
			function createGroup( filelist ) {
				var applications = Array.isArray( group.applications ) ?
					group.applications : [ group.applications ],
					tests = [];

				_.forOwn( filelist.tests, function( test, id ) {
					test.id = id;
					test.assertion = group.assertion;
					test.applications = applications;
					test.group = group.name;

					tests.push( test );
				} );

				return whenCall( db.insert, tests );
			}

			return when
				.map( group.paths, getPaths )
				.then( prepareFileList )
				.then( runBuilders )
				.then( createGroup );
		};

		/**
		 * Get test(s) for given id(s)
		 * @param  {String} id Test id(s)
		 * @return {Promise}
		 */
		tests.get = function( id ) {
			return whenCall( db.findOne, {
				id: id
			} );
		};

		/**
		 * List all the tests
		 * @return {Promise}
		 */
		tests.list = function() {
			var query;

			if ( !tests.ready ) {
				return when.resolve( [] );
			}

			query = db.find( {} ).sort( {
				group: 1,
				id: 1
			} );

			return whenCall( query.exec.bind( query ) )
				.then( function( data ) {
					return data.map( function( test ) {
						return {
							id: test.id,
							tags: test.tags ? test.tags.join( ', ' ) : '',
							group: test.group
						};
					} );
				} );
		};

		/**
		 * Check if given file path should be accessible through the HTTP server
		 * @param  {String} file File path
		 * @return {Boolean}
		 */
		tests.checkFile = function( file ) {
			return tests.files.indexOf( file ) > -1;
		};
	},

	/**
	 * Initialize module
	 * @param {Function} done Initialization completion callback
	 */
	init: function( done ) {
		var bender = this;

		bender.tests.build();
		bender.tests.watch();

		done();
	}
};
