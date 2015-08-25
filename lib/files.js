/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages files
 */

'use strict';

var fs = require( 'graceful-fs' ),
	call = require( 'when/node' ).call,
	when = require( 'when' ),
	pipeline = require( 'when/pipeline' ),
	Minimatch = require( 'minimatch' ).Minimatch,
	logger = require( './logger' ).create( 'files', true ),
	mime = require( 'mime' ),
	path = require( 'path' );

/**
 * File manager
 * @module files
 */
module.exports = {
	name: 'files',

	attach: function() {
		logger.debug( 'attach' );

		var bender = this,
			/**
			 * File manager
			 * @type {module:files}
			 * @memberOf module:bender
			 */
			files = bender.files = {},

			/**
			 * Files store
			 * @type {Object}
			 * @memberOf module:files
			 */
			store = files.store = {};


		/**
		 * File constructor
		 * @param {String} file File path
		 * @memberOf module:files
		 * @constructor
		 */
		function File( file ) {
			this.path = file;
			this.originalPath = file;
			this.content = null;
			this.mime = mime.lookup( file );
			this.mtime = null;
			this.size = 0;
			this.modified = true;
		}

		/**
		 * File constructor
		 * @type {module:files.File}
		 */
		files.File = File;

		/**
		 * Return a file's content. If no content stored yet, read it from the file system
		 * @return {Promise}
		 */
		File.prototype.read = function( useOriginal ) {
			logger.debug( 'read', this.path );
			var that = this;

			return this.checkModified( useOriginal )
				.then( function( stat ) {
					logger.debug( '%s modified - %s', that.path, !!stat );

					return !stat ?
						when.resolve( that.content ) :
						call( fs.readFile, useOriginal ? that.originalPath : that.path )
						.then( function( content ) {
							that.mtime = stat.mtime;
							that.size = stat.size;
							that.modified = true;
							that.content = content;

							return that.process();
						} )
						.then( function( file ) {
							return file.content;
						} );
				} );
		};

		/**
		 * Checks if the file was modified since the last update, return the current modification date if so
		 * @return {Promise}
		 */
		File.prototype.checkModified = function( useOriginal ) {
			var that = this;

			return call( fs.stat, useOriginal ? this.originalPath : this.path )
				.then( function( stat ) {
					if ( Number( stat.mtime ) !== Number( that.mtime ) || stat.size !== that.size ) {
						return stat;
					}

					return false;
				}, function( err ) {
					// file is missing so remove it from the store
					/* istanbul ignore else */
					if ( err.code === 'ENOENT' ) {
						files.remove( that.path );
					}

					throw err;
				} );
		};

		/**
		 * Send a file's content as an HTTP response
		 * @param  {Object} req HTTP request
		 * @param  {Object} res HTTP response
		 * @return {Promise}
		 */
		File.prototype.send = function( req, res, useOriginal ) {
			logger.debug( 'send', this.path );
			var that = this;

			return this.read( useOriginal )
				.then( function( content ) {
					var modSince = req.headers[ 'if-modified-since' ];

					res.setHeader( 'Date', new Date().toUTCString() );
					res.setHeader( 'Last-Modified', that.mtime.toUTCString() );

					if ( !that.modified && modSince === that.mtime.toUTCString() ) {
						logger.debug( 'use cache for', that.path );
						// send "not modified" response
						res.writeHead( 304, {
							'Pragma': 'public',
							'Cache-Control': 'public, max-age=0'
						} );
						res.end();
					} else {
						// send a normal response with content
						res.writeHead( 200, {
							'Content-Type': that.mime,
							'Content-Length': content.length
						} );
						res.end( content );

						that.modified = false;
					}
				} );
		};

		/**
		 * Process a file's content with available preprocessors
		 * @return {Promise}
		 */
		File.prototype.process = function() {
			logger.debug( 'process', this.path );

			return bender.preprocessors && bender.preprocessors.length ?
				pipeline( bender.preprocessors.list(), this ) :
				when.resolve( this );
		};



		/**
		 * Add a file to the store
		 * @param {Strign} filePath File path
		 * @memberOf module:files
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
		 * @memberOf module:files
		 */
		files.find = function( file ) {
			var found = store[ file ];

			logger.debug( 'find file %s - %s', file, found ? 'found' : 'not found' );

			return found || null;
		};

		/**
		 * Retrieve a file from the store
		 * @param  {String} file File path
		 * @return {File}
		 * @memberOf module:files
		 */
		files.get = function( file ) {
			logger.debug( 'get file', file );

			return files.find( file ) || files.add( file );
		};

		/**
		 * Read a file
		 * @param  {String} file File path
		 * @return {Promise}
		 * @memberOf module:files
		 */
		files.read = function( file ) {
			logger.debug( 'read file', file );

			file = this.get( file );

			return file.read();
		};

		/**
		 * Read a file's content as a string
		 * @param  {String} file File path
		 * @return {Promise}
		 * @memberOf module:files
		 */
		files.readString = function( file, callback ) {
			return this.read( file ).then( function( content ) {
				return callback ? callback( content.toString() ) : content.toString();
			} );
		};

		/**
		 * Update a file and remove its cached content
		 * @param {String} file File path
		 * @memberOf module:files
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
		 * @memberOf module:files
		 */
		files.remove = function( file ) {
			logger.debug( 'remove', file );

			delete store[ file ];
		};

		// a store for Minimatch instances
		var minimatchCache = {};

		/**
		 * Check if the given path if valid against the given patterns
		 * @param  {String}         file     File path
		 * @param  {Array.<String>} patterns Array of patterns
		 * @return {Boolean}
		 * @memberOf module:files
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

			// match a file with a pattern taken from the cache (if available)
			function match( pattern ) {
				var matcher = minimatchCache[ pattern ];

				if ( !matcher ) {
					matcher = minimatchCache[ pattern ] = new Minimatch( pattern );
				}

				return matcher.match( file );
			}

			return !excludes.some( match ) && includes.some( match );
		};

		/**
		 * Send a file as an HTTP response
		 * @param  {String}  filePath       Path to a file
		 * @param  {Object}  req            HTTP request
		 * @param  {Object}  res            HTTP response
		 * @param  {String}  [originalPath] Original path of the file, used to filter files
		 * @param  {Boolean} [useOriginal]  Flag telling if the original path should be used
		 * @return {Promise}
		 * @memberOf module:files
		 */
		files.send = function( filePath, req, res, originalPath, useOriginal ) {
			var file;

			filePath = bender.utils.stripParams( filePath );

			file = files.get( filePath );

			// update a file's originalPath, e.g. when a file wasn't in the store before trying to send it
			if ( originalPath && originalPath !== file.originalPath ) {
				file.originalPath = originalPath;
			}

			return file.send( req, res, useOriginal );
		};
	}
};
