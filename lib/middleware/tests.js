/**
 * @file Builds test context, serves test assets
 */

var path = require( 'path' ),
	send = require( 'send' ),
	logger = require( '../logger' );

/**
 * Create a HTTP handler that servers test context and files
 * @return {Function}
 */
function create( bender ) {
	return function( req, res, next ) {
		var url = req.url.substr( 1 ).split( '/' ),
			query = req.url.split( '?' )[ 1 ],
			file,
			ext,
			id;

		function resume( err ) {
			if ( err && err.code !== 'ENOENT' ) {
				logger.error( err );
			}
			next();
		}

		if ( req.method !== 'GET' || url[ 0 ] !== 'tests' ) {
			return next();
		}

		// serve list of all tests
		if ( !url.slice( 1 ).join( '/' ) ) {
			return bender.tests
				.list()
				.done( function( data ) {
					bender.utils.renderJSON( res, {
						test: data
					} );
				}, resume );
		}

		// test id without query
		file = url.slice( 1 ).join( '/' ).split( '?' )[ 0 ];

		// serve test page both for .js and .html extension
		id = decodeURIComponent( ( ext = path.extname( file ) ) ? file.replace( ext, '' ) : file );

		// add query string to test id (used by i.e. jQuery plugin)
		if ( query ) {
			id += '?' + query;
		}

		// remove & at the end of url
		if ( id.substr( -1 ) === '&' ) {
			id = id.slice( 0, -1 );
		}

		bender.tests
			.get( id )
			.done( function( test ) {
				// host assets from a test directory
				if ( !test ) {
					return send( req, path.normalize( file ) ).on( 'error', resume ).pipe( res );
				}

				// server from the cache
				if ( ( file = bender.cache.getPath( test.id ) ) ) {
					send( req, file ).on( 'error', resume ).pipe( res );
					// write to the cache and render
				} else {
					bender.template
						.build( test )
						.then( function( data ) {
							return bender.cache.write( test.id, data );
						} )
						.done( function( content ) {
							bender.utils.renderHTML( res, content );
						}, resume );
				}
			}, resume );
	};
}

module.exports = {
	name: 'bender-middleware-tests',
	create: create
};
