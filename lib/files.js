/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages files
 */

'use strict';

var fs = require( 'graceful-fs' ),
	call = require( 'when/node' ).call,
	callbackCall = require( 'when/callbacks' ).call,
	when = require( 'when' ),
	pipeline = require( 'when/pipeline' ),
	chokidar = require( 'chokidar' ),
	minimatch = require( 'minimatch' ),
	glob = require( 'glob' ),
	logger = require( './logger' ).create( 'files', true ),
	mime = require( 'mime' ),
	path = require( 'path' );

module.exports = {
	name: 'files',

	attach: function() {
		var bender = this,
			files = bender.files = {},
			store = files.store = {},
			watcher = files.watcher = new chokidar.FSWatcher();

		/**
		 * File object constructor
		 * @param {String} file File path
		 * @constructor
		 */
		function File( file ) {
			this.path = file;
			this.oldPath = file;
			this.content = null;
			this.mime = mime.lookup( file );
		}

		files.File = File;

		/**
		 * Return file's content. If no content stored yet, it will read it from the file system
		 * @return {Promise}
		 */
		File.prototype.read = function() {
			var that = this;

			return this.content ?
				when.resolve( this.content ) :
				call( fs.readFile, this.path )
				.then( function( content ) {
					that.content = content.toString();
					return that.process();
				} )
				.then( function( file ) {
					return file.content;
				} );
		};

		/**
		 * Send a file's content as an HTTP response
		 * @param {Object}   res         HTTP response
		 * @param {Function} errCallback Function called on error
		 */
		File.prototype.send = function( res, errCallback ) {
			var mime = this.mime;

			this.read()
				.done( function( content ) {
					res.writeHead( 200, {
						'Content-Type': mime,
						'Content-Length': Buffer.byteLength( content, 'utf8' ),
						'Cache-Control': 'no-cache, no-store, must-revalidate',
						'Pragma': 'no-cache',
						'Expires': 0
					} );
					res.end( content );
				}, errCallback );
		};

		/**
		 * Process file contents with available preprocessors
		 * @return {Promise}
		 */
		File.prototype.process = function() {
			return bender.preprocessors && bender.preprocessors.length ?
				pipeline( bender.preprocessors, this ) :
				when.resolve( this );
		};



		/**
		 * Add a file to the store
		 * @param {Strign} filePath File path
		 */
		files.add = function( filePath ) {
			logger.debug( 'add file', filePath );

			var file = new File( filePath );

			store[ filePath ] = file;

			return file;
		};

		/**
		 * Find a file in the store
		 * @param  {String} file File path
		 * @return {File|null}
		 */
		files.find = function( file ) {
			var found = store[ file ];

			logger.debug( 'find file %s - %s', file, !!found );

			return found || null;
		};

		/**
		 * Get a file from the store
		 * @param  {String} file File path
		 * @return {Promise}
		 */
		files.get = function( file ) {
			logger.debug( 'get file', file );

			var found = files.find( file );

			return found ? when.resolve( found ) : callbackCall( fs.exists, file )
				.then( function( exists ) {
					return exists ? files.add( file ) : null;
				} );
		};

		/**
		 * Update file and remove it's content
		 * @param {String} file File path
		 */
		files.update = function( file ) {
			logger.debug( 'update', file );

			file = files.find( file );

			/* istanbul ignore else */
			if ( file ) {
				file.content = null;
			}
		};

		/**
		 * Remove a file from the store
		 * @param {String} file File path
		 */
		files.remove = function( file ) {
			logger.debug( 'remove', file );

			delete store[ file ];
		};

		/**
		 * Add a path to the file watcher
		 * @param {String}         path      Path to be watched
		 * @param {Array.<String>} [ignores] Array of patterns to ignore
		 */
		files.watch = function( watchPath, ignores ) {
			logger.debug( 'watch', watchPath );
			var options = {
				nosort: true
			};

			glob(
				watchPath.indexOf( '*' ) === -1 ? path.join( watchPath, '**/*.*' ) : watchPath,
				options,
				function( err, files ) {
					/* istanbul ignore if */
					if ( err ) {
						return logger.error( String( err ) );
					}

					// apply ignore patterns if any
					if ( ignores ) {
						files = files.filter( function( file ) {
							return ignores.every( function( pattern ) {
								return !minimatch(
									file,
									pattern.indexOf( '*' ) === -1 ? pattern + '**/*.*' : pattern
								);
							} );
						} );
					}

					watcher.add( files );
				} );
		};

		/**
		 * Check if the given path if valid against the given patterns
		 * @param  {String}         file     File path
		 * @param  {Array.<String>} patterns Array of patterns
		 * @return {Boolean}
		 */
		files.isValidPath = function( file, patterns ) {
			var excludes = [],
				includes = [];

			file = path.relative( process.cwd(), file );

			patterns.forEach( function( pattern ) {
				if ( pattern[ 0 ] === '!' ) {
					excludes.push( pattern.substr( 1 ) );
				} else {
					includes.push( pattern );
				}
			} );

			function match( pattern ) {
				return minimatch( file, pattern );
			}

			return !excludes.some( match ) && includes.some( match );
		};

		/**
		 * Send a file as an HTTP response
		 * @param {String}   filePath    Path to a file
		 * @param {Object}   res         HTTP response
		 * @param {Function} errCallback Error handler function
		 */
		files.send = function( filePath, res, errCallback, oldPath ) {
			filePath = bender.utils.stripParams( filePath );

			files.get( filePath ).then( function( file ) {
				if ( !file ) {
					return errCallback();
				}

				if ( oldPath && oldPath !== file.oldPath ) {
					delete store[ file.oldPath ];
					file.oldPath = oldPath;
					store[ oldPath ] = file;
				}

				file.send( res, errCallback );
			}, errCallback );
		};

		// attach file watcher events
		watcher
			.on( 'add', function( file ) {
				files.add( path.resolve( file ) );
			} )
			.on( 'unlink', function( file ) {
				files.remove( path.resolve( file ) );
			} )
			.on( 'change', function( file ) {
				files.update( path.resolve( file ) );
			} )
			.on( 'error', /* istanbul ignore next */ function( err ) {
				logger.error( String( err ) );
			} );
	}
};
