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

		bender.checkDeps( module.exports.name, 'testbuilders', 'cache', 'conf' );


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

					_.forOwn( result, function( group ) {
						joined = joined.concat( group );
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

				return tests;
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
			console.log( id );
			return when.resolve();
		};

		/**
		 * Check if the given file is located inside of tests' base paths
		 * @param  {[type]} file [description]
		 * @return {[type]}      [description]
		 */
		tests.checkPath = function( file ) {
			var basePaths = [];

			// create promises for all test groups
			_.forOwn( bender.conf.tests, function( group, name ) {
				if ( basePaths.indexOf( group.basePath ) === -1 ) {
					basePaths.push( group.basePath );
				}
			} );

			return basePaths.some( function( basePath ) {
				return file.indexOf( basePath ) === 0;
			} );
		};
	}
};
