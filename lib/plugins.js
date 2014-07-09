/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages plugins
 */

'use strict';

var path = require( 'path' ),
	fs = require( 'fs' ),
	_ = require( 'lodash' ),
	logger = require( './logger' ).create( 'plugins', true );

/**
 * Bender plugin constructor
 * @param {Object} options Configuration options
 * @constructor
 */
function Plugin( name, options ) {
	_.merge( this, options, {
		name: name
	} );

	if ( options.files ) {
		this.parseFiles( options.files );
	}
}

/**
 * Parse file paths and assign them to appropriate arrays
 * @param {Array.<String>} files Array of files
 */
Plugin.prototype.parseFiles = function( files ) {
	var pattern = /\.(css|js)$/;

	this.js = [];
	this.css = [];

	files.forEach( function( file ) {
		var ext = pattern.exec( file );

		/* istanbul ignore else */
		if ( ext ) {
			this[ ext[ 1 ] ].push(
				path.join( '/plugins/', file ).split( path.sep ).join( '/' )
			);
		}
	}, this );
};

/**
 * @module plugin-manager
 */
module.exports = {

	name: 'plugin-manager',

	/**
	 * Attach module to Bender
	 */
	attach: function() {
		var bender = this,
			plugins;

		plugins = {
			/**
			 * Plugin file list, used internally
			 * @priate
			 * @type {Array}
			 */
			_fileList: [],

			/**
			 * Add a plugin
			 * @param {Object}         options       Plugin configuration
			 * @param {String}         options.name  Plugin's name
			 * @param {Array.<String>} options.files Plugin's files
			 */
			add: function( name, options ) {
				var match,
					plugin,
					group,
					type;

				if ( !options.name || !( match = options.name.match( /bender\-(\w+)\-(\w+)/ ) ) ||
					!( name = match[ 2 ] ) || !( type = match[ 1 ] ) || !( group = bender[ type + 's' ] ) ) {
					logger.error( 'Invalid definition for plugin: ' + name );
					process.exit( 1 );
				}

				plugin = new Plugin( name, options );

				if ( Array.isArray( group ) ) {
					group.push( plugin.build );
				} else {
					group[ name ] = plugin;
				}

				if ( options.files ) {
					plugins.addFiles( plugin.files );
				}
			},

			/**
			 * Add files to the list of valid, shared files
			 * @param {Array.<String>} files File paths
			 */
			addFiles: function( files ) {
				plugins._fileList = plugins._fileList.concat( files );
			},

			/**
			 * Check if given path is defined in plugins.
			 * This function is used to validate whether a file should be served or not
			 * because plugins' files have absolute paths and we don't want to give the
			 * access to the file system that way...
			 * @param  {String} file File path
			 * @return {Boolean}
			 */
			checkFile: function( file ) {
				return plugins._fileList.indexOf( path.normalize( file ) ) > -1;
			},

			/**
			 * Load plugins defined in Bender configuration
			 */
			load: function() {
				if ( !Array.isArray( bender.conf.plugins ) ) {
					return;
				}

				bender.conf.plugins.forEach( function( name ) {
					var plugin,
						pluginPath;

					try {
						if ( fs.existsSync( ( pluginPath = path.resolve( name ) ) ) ) {
							plugin = require( pluginPath );
						} else {
							plugin = require( path.join( process.cwd(), '/node_modules/', name ) );
						}
					} catch ( e ) {
						logger.error( 'Couldn\'t include plugin: ' + name );
						logger.error( e );
						process.exit( 1 );
					}

					// attach server side plugins
					if ( plugin.attach ) {
						bender.use( plugin );
					} else {
						this.add( name, plugin );
					}

					logger.info( 'Loaded plugin: %s', name );
				}, this );
			}
		};

		// used to fix conflicts with internal application's property called 'plugins'
		bender.plugins = _.merge( plugins, bender.plugins );

		bender.assertions = bender.assertions || {};
		bender.pagebuilders = bender.pagebuilders || [];
		bender.testbuilders = bender.testbuilders || [];
		bender.reporters = bender.reporters || {};

		bender.plugins.load();
	}
};
