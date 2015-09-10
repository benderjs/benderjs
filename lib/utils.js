/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Contains reusable utilities
 */

/* globals Buffer */

'use strict';

var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	logger = require( './logger' );

/**
 * Reusable utilities
 * @module utils
 */
module.exports = {

	name: 'utils',

	attach: function() {
		var bender = this,
			/**
			 * Reusable utilities
			 * @type {module:utils}
			 * @memberOf module:bender
			 */
			utils = bender.utils = {},
			tplPattern = /(?:%)(\w+)(?:%)/g;

		/**
		 * Dependency check helper function
		 * @param {String}    name    Name of the module
		 * @param {...String} modules Dependency names
		 * @memberOf module:bender
		 * @method checkDeps
		 */
		bender.checkDeps = function( name, modules ) {
			modules = Array.prototype.slice.call( arguments, 1 );

			Array.prototype.forEach.call( modules, function( mod ) {
				if ( bender[ mod ] ) {
					return;
				}

				logger.error( 'Missing module:', mod );
				logger.error( 'Module', name, 'requires:', modules.join( ', ' ) );
				process.exit( 1 );
			} );
		};

		/**
		 * Render HTML content as a response
		 * @param {Object} res  HTTP response
		 * @param {String} html HTML to render
		 * @memberOf module:utils
		 * @method renderHTML
		 */
		utils.renderHTML = function( res, html ) {
			res.writeHead( 200, {
				'Content-Type': 'text/html',
				'Content-Length': Buffer.byteLength( html, 'utf8' ),
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': 0
			} );
			res.end( html );
		};

		/**
		 * Render JSON object as a response
		 * @param {Object} res HTTP response
		 * @param {Object} obj Object to render
		 * @memberOf module:utils
		 * @method renderJSON
		 */
		utils.renderJSON = function( res, obj ) {
			var str = JSON.stringify( obj );

			res.writeHead( 200, {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength( str, 'utf8' ),
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': 0
			} );
			res.end( str );
		};

		/**
		 * Render given script as a response
		 * @param {Object} res    HTTP response
		 * @param {String} script Script's content
		 * @memberOf module:utils
		 * @method renderScript
		 */
		utils.renderScript = function( res, script ) {
			res.writeHead( 200, {
				'Content-Type': 'application/javascript',
				'Content-Length': Buffer.byteLength( script, 'utf8' ),
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': 0
			} );
			res.end( script );
		};

		/**
		 * Replace %NAME% tags with properties of the given data object
		 * @param  {String} tpl  Template string
		 * @param  {Object} data Data object
		 * @return {String}
		 * @memberOf module:utils
		 * @method template
		 */
		utils.template = function( tpl, data ) {
			return tpl.replace( tplPattern, function( match, param ) {
				return ( typeof data == 'object' && data[ param ] ) ? data[ param ] : match;
			} );
		};

		/**
		 * Create a direcory and its parent directories if needed
		 * @param {String}   dirPath    Directory path to create
		 * @param {Function} callback   Function called when done or an error occures
		 * @param {Number}   [position] Used internally
		 * @memberOf module:utils
		 * @method mkdirp
		 */
		utils.mkdirp = function( dirPath, callback, position ) {
			var next = function() {
					utils.mkdirp( dirPath, callback, position + 1 );
				},
				directory,
				parts;

			position = position || 0;
			parts = path.normalize( dirPath ).split( path.sep );

			if ( position >= parts.length ) {
				return callback();
			}

			directory = parts.slice( 0, position + 1 ).join( path.sep );

			if ( !directory ) {
				return next();
			}

			fs.stat( directory, function( err ) {
				if ( err ) {
					fs.mkdir( directory, function( err ) {
						if ( err && err.code !== 'EEXIST' ) {
							callback( err );
						} else {
							next();
						}
					} );
				} else {
					next();
				}
			} );
		};

		/**
		 * Strip URL parameters from a file path
		 * @param  {String} file File path
		 * @return {String}
		 * @memberOf module:utils
		 * @method stripParams
		 */
		utils.stripParams = function( file ) {
			return file.trim().split( '?' )[ 0 ].split( ';' )[ 0 ];
		};
	}
};
