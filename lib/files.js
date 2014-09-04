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
	minimatch = require( 'minimatch' ),
	logger = require( './logger' ).create( 'files', true ),
	mime = require( 'mime' ),
	path = require( 'path' );

module.exports = {
	name: 'files',

	attach: function() {
		logger.debug( 'attach' );

		var bender = this,
			files = bender.files = {},
			store = files.store = {};

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
			this.mtime = null;
		}

		files.File = File;

		/**
		 * Return file's content. If no content stored yet, it will read it from the file system
		 * @return {Promise}
		 */
		File.prototype.read = function() {
			logger.debug( 'read', this.path );
			var that = this;

			return this.checkModified()
				.then( function( isModified ) {
					logger.debug( '%s modified: %s', that.path, isModified );

					return !isModified ?
						when.resolve( that.content ) :
						call( fs.readFile, that.path )
						.then( function( content ) {
							that.content = content.toString();
							return that.process();
						} )
						.then( function( file ) {
							return file.content;
						} );
				} );
		};

		/**
		 * Checks if the file was modified since last update
		 * @return {Promise}
		 */
		File.prototype.checkModified = function() {
			var that = this;

			return call( fs.stat, this.path )
				.then( function( stat ) {
					if ( +stat.mtime !== that.mtime ) {
						that.mtime = +stat.mtime;
						return true;
					}

					return false;
				}, function( err ) {
					/* istanbul ignore else */
					if ( err.code === 'ENOENT' ) {
						files.remove( that.oldPath );
					}

					throw err;
				} );
		};

		/**
		 * Send a file's content as an HTTP response
		 * @param {Object}   res         HTTP response
		 * @param {Function} errCallback Function called on error
		 */
		File.prototype.send = function( res, errCallback ) {
			logger.debug( 'send', this.path );
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
			logger.debug( 'process', this.path );

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

	}
};
