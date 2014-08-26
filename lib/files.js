var fs = require( 'graceful-fs' ),
	call = require( 'when/node' ).call,
	callbackCall = require( 'when/callbacks' ).call,
	when = require( 'when' ),
	chokidar = require( 'chokidar' ),
	logger = require( './logger' ).create( 'files', true ),
	mime = require( 'mime' );

/**
 * File object constructor
 * @param {String} file File path
 * @constructor
 */
function File( file ) {
	this.path = file;
	this.content = null;
	this.updated = true;
	this.mime = mime.lookup( file );
}

/**
 * Return file's content. If no content stored yet, it will read it from the file system
 * @return {Promise}
 */
File.prototype.read = function() {
	return this.content ? when.resolve( this.content ) : call( fs.readFile, this.path )
		.then( function( content ) {
			this.content = content.toString();

			return content;
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
		.then( function( content ) {
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

module.exports = {
	name: 'files',

	attach: function() {
		var bender = this,
			files = bender.files = {},
			watcher = new chokidar.FSWatcher(),
			store = {};

		/**
		 * Add a file to the store
		 * @param {Strign} file File path
		 */
		files.add = function( file ) {
			store[ file ] = new File( file );

			return files;
		};

		/**
		 * Get a file from the store
		 * @param  {String} file File path
		 * @return {Promise}
		 */
		files.get = function( file ) {
			return store[ file ] ? when.resolve( store[ file ] ) : callbackCall( fs.exists, file )
				.then( function( exists ) {
					return exists ?
						files.add( file ).get( file ) :
						when.resolve( null );
				} );
		};

		/**
		 * Update file and remove it's content
		 * @param {String} file File path
		 */
		files.update = function( file ) {
			// remove file's content to make sure new version will be read
			if ( store[ file ] ) {
				store[ file ].updated = true;
				store[ file ].content = null;
			}
		};

		/**
		 * Remove a file from the store
		 * @param {String} file File path
		 */
		files.remove = function( file ) {
			delete store[ file ];

			return files;
		};

		/**
		 * Add a path to the file watcher
		 * @param {String} path Path to be watched
		 */
		files.watch = function( path ) {
			watcher.add( path );

			return files;
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
