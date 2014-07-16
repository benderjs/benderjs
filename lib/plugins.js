/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages plugins
 */

'use strict';

var path = require( 'path' ),
	fs = require( 'graceful-fs' ),
	_ = require( 'lodash' ),
	logger = require( './logger' ).create( 'plugins', true );

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

		function Reporter( name, options ) {
			var that = this;

			Plugin.apply( this, arguments );

			bender.onAny( function() {
				if ( typeof that[ this.event ] == 'function' ) {
					that[ this.event ].apply( bender, arguments );
				}
			} );
		}

		Reporter.prototype = Object.create( Plugin.prototype );
		Reporter.constructor = Plugin;


		Reporter.prototype.attach = function() {
			bender.reporters[ this.name ] = this;
		};

		function PageBuilder( name, options ) {
			Plugin.apply( this, arguments );
		}

		PageBuilder.prototype = Object.create( Plugin.prototype );
		PageBuilder.constructor = Plugin;

		PageBuilder.prototype.attach = function() {
			var html = bender.plugins[ 'bender-pagebuilder-html' ],
				idx;

			// add plugin before pagebuilder-html
			if ( html && ( idx = bender.pagebuilders.indexOf( html.build ) ) > -1 ) {
				bender.pagebuilders.splice( idx, 0, this.build );
			} else {
				bender.pagebuilders.push( this.build );
			}
		};

		function TestBuilder( name, options ) {
			Plugin.apply( this, arguments );
		}

		TestBuilder.prototype = Object.create( Plugin.prototype );
		TestBuilder.constructor = Plugin;

		TestBuilder.prototype.attach = function() {
			bender.testbuilders.push( this.build );
		};

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

				if ( type === 'reporter' ) {
					plugin = new Reporter( name, options );
				} else if ( type === 'pagebuilder' ) {
					plugin = new PageBuilder( name, options );
				} else if ( type === 'testbuilder' ) {
					plugin = new TestBuilder( name, options );
				} else {
					plugin = new Plugin( name, options );
					if ( Array.isArray( group ) ) {
						group.push( plugin.build );
					} else {
						group[ name ] = plugin;
					}
				}

				if ( plugin.attach ) {
					plugin.attach();
				}

				if ( plugin.files ) {
					this.addFiles( plugin.files );
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

		bender.frameworks = {};
		bender.reporters = {};
		bender.pagebuilders = [];
		bender.testbuilders = [];
		bender.middlewares = [];
	}
};
