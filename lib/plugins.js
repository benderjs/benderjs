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
		 * @param {String} name    Plugin name
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
		 * Bender reporter plugin constructor
		 * @param {String} name    Reporter name
		 * @param {Object} options Configuration options
		 * @extends {Plugin}
		 */
		function Reporter( name, options ) {
			var that = this;

			Plugin.apply( this, arguments );

			bender.onAny( function() {
				if ( typeof that[ this.event ] == 'function' ) {
					that[ this.event ].apply( bender, arguments );
				}
			} );

			/**
			 * Attach reporter to Bender reporters
			 */
			this.attach = function() {
				bender.reporters[ that.name ] = that;
			};
		}

		Reporter.prototype = Object.create( Plugin.prototype );
		Reporter.constructor = Plugin;

		/**
		 * Page builder plugin constructor
		 * @param {String} name    Page builder name
		 * @param {Object} options Configuration options
		 * @extends {Plugin}
		 */
		function PageBuilder( name, options ) {
			var that = this;

			Plugin.apply( this, arguments );

			this.name = options.name;

			/**
			 * Attach page builder to Bender page builders.
			 * If the html page builder is present, add this one before it
			 */
			this.attach = function() {
				var html = bender.plugins[ 'bender-pagebuilder-html' ],
					idx;

				// add plugin before pagebuilder-html
				if ( html && ( idx = bender.pagebuilders.indexOf( html.build ) ) > -1 ) {
					bender.pagebuilders.splice( idx, 0, that.build );
				} else {
					bender.pagebuilders.push( that.build );
				}
			};
		}

		PageBuilder.prototype = Object.create( Plugin.prototype );
		PageBuilder.constructor = Plugin;

		/**
		 * Test builder constructor
		 * @param {String} name    Test builder name
		 * @param {Object} options Configuration options
		 * @extends {Plugin}
		 */
		function TestBuilder( name, options ) {
			var that = this;

			Plugin.apply( this, arguments );

			/**
			 * Attach test builder to Bender test builders
			 */
			this.attach = function() {
				bender.testbuilders.push( that.build );
			};
		}

		TestBuilder.prototype = Object.create( Plugin.prototype );
		TestBuilder.constructor = Plugin;

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
			add: function( options ) {
				var match,
					plugin,
					group,
					name,
					type;

				if ( !options.name || !( match = options.name.match( /bender\-(\w+)\-(\w+)/ ) ) ||
					!( name = match[ 2 ] ) || !( type = match[ 1 ] ) || !( group = bender[ type + 's' ] ) ) {
					logger.error( 'Invalid definition for plugin: ' + options.name );
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

				// attach plugin to proper plugin group if needed
				if ( plugin.attach ) {
					bender.use( plugin );
				}

				// mark plugin's files as valid, shared files
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
						this.add( plugin );
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
