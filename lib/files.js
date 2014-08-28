var fs = require( 'graceful-fs' ),
	call = require( 'when/node' ).call,
	callbackCall = require( 'when/callbacks' ).call,
	when = require( 'when' ),
	pipeline = require( 'when/pipeline' ),
	chokidar = require( 'chokidar' ),
	logger = require( './logger' ).create( 'files', true ),
	mime = require( 'mime' ),
	path = require( 'path' );

module.exports = {
	name: 'files',

	attach: function() {
		var bender = this,
			files = bender.files = {},
			watcher = new chokidar.FSWatcher(),
			store = [];

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
						'Content-Length': content.length,
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
			return bender.preprocessors.length ?
				pipeline( bender.preprocessors, this ) :
				when.resolve( this );
		};



		/**
		 * Add a file to the store
		 * @param {Strign} file File path
		 */
		files.add = function( file ) {
			logger.debug( 'add file', file );

			file = new File( file );

			store.push( file );

			return file;
		};

		/**
		 * Get a file from the store
		 * @param  {String} file File path
		 * @return {Promise}
		 */
		files.get = function( file ) {
			logger.debug( 'get file', file );

			var found;

			store.some( function( item ) {
				if ( item.oldPath === file ) {
					found = item;
					return true;
				}
			} );

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

			files.get( file ).done( function( file ) {
				if ( file ) {
					file.content = null;
				}
			} );
		};

		/**
		 * Remove a file from the store
		 * @param {String} file File path
		 */
		files.remove = function( file ) {
			logger.debug( 'remove', file );

			files.get( file ).done( function() {
				if ( file ) {
					store.splice( store.indexOf( file ), 1 );
				}
			} );
		};

		/**
		 * Add a path to the file watcher
		 * @param {String} path Path to be watched
		 */
		files.watch = function( watchPath ) {
			logger.debug( 'watch', watchPath );

			watcher.add( path.resolve( watchPath ) );
		};

		/**
		 * Check if the given path if valid against the given patterns
		 * @param  {String}         file     File path
		 * @param  {Array.<String>} patterns Array of patterns
		 * @return {Boolean}
		 */
		files.isValidPath = function( file, patterns ) {
			return patterns.some( function( pattern ) {
				return pattern[ 0 ] !== '!' && file.indexOf( path.resolve( pattern ) ) > -1;
			} ) && patterns.every( function( pattern ) {
				return pattern[ 0 ] === '!' ? file.indexOf( pattern.substr( 1 ) ) === -1 : true;
			} );
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
					file.oldPath = oldPath;
				}

				file.send( res, errCallback );
			}, errCallback );
		};

		// attach file watcher events
		watcher
			.on( 'add', files.add )
			.on( 'unlink', files.remove )
			.on( 'change', files.update )
			.on( 'error', function( err ) {
				logger.error( String( err ) );
			} );
	}
};
