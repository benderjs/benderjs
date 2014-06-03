'use strict';

/**
 * @file Serves job assets
 */

var path = require( 'path' ),
	parse = require( 'url' ).parse,
	send = require( 'send' ),
	logger = require( '../logger' );

/**
 * Create a HTTP handler serving job requests
 * @return {Function}
 */
function create( bender ) {
	return function( req, res, next ) {
		var parsed = parse( req.url ),
			url = req.url.substr( 1 ).split( '/' );

		if ( url[ 0 ] !== 'jobs' ) {
			return next();
		}

		function resume( err ) {
			if ( err && err.code !== 'ENOENT' ) {
				logger.error( err );
			}
			next();
		}

		// send a file located in job's directory
		function sendFile() {
			send( req, path.join( process.cwd(), '.bender/', url.join( '/' ).split( '?' )[ 0 ] ) )
				.on( 'error', resume )
				.pipe( res );
		}

		// handle specific job id
		function serveJob( job ) {
			var file,
				id,
				ext;

			// no such job - leave
			if ( !job ) {
				return resume();
			}

			// only job id is specified - get jobs results and render in JSON
			if ( !url[ 2 ] ) {
				return bender.jobs
					.get( job._id )
					.done( function( job ) {
						bender.utils.renderJSON( res, job );
					} );
			}

			// request for a test (task) or its asset
			if ( url[ 2 ] === 'tests' ) {

				// remove query from task/file name
				file = url.slice( 3 ).join( '/' ).split( '?' )[ 0 ];

				// remove extension
				id = decodeURIComponent( ( ext = path.extname( file ) ) ? file.replace( ext, '' ) : file );

				// add query string to task id (used by i.e. jQuery plugin)
				if ( parsed.search ) {
					id += parsed.search;
				}

				// remove & at the end of url
				if ( id.substr( -1 ) === '&' ) {
					id = id.slice( 0, -1 );
				}

				bender.jobs
					.getTask(
						url[ 1 ],
						id
				)
					.done( function( task ) {
						// no such task - try to send a file from jobs directory
						if ( !task ) {
							return sendFile();
						}

						// server from the cache
						if ( ( file = bender.cache.getPath( job.id + '/' + task.id ) ) ) {
							send( req, file ).on( 'error', resume ).pipe( res );
							// write to the cache and render
						} else {
							bender.template
								.build( task )
								.then( function( data ) {
									return bender.cache.write( job.id + '/' + task.id, data );
								} )
								.done( function( content ) {
									bender.utils.renderHTML( res, content );
								}, resume );
						}
					}, resume );
				// send a file from jobs directory
			} else {
				sendFile();
			}
		}

		if ( req.method === 'GET' ) {
			// serve list of all jobs in JSON
			if ( !url[ 1 ] ) {
				return bender.jobs
					.list()
					.done( function( jobs ) {
						bender.utils.renderJSON( res, {
							job: jobs
						} );
					}, resume );
			}

			// serve job details
			bender.jobs
				.find( url[ 1 ] )
				.done( serveJob, resume );
		} else if ( req.method === 'POST' && req.url === '/jobs' ) {
			// create new job
			bender.jobs
				.create( req.body )
				.done( function( id ) {
					bender.utils.renderJSON( res, {
						id: id
					} );
				}, resume );
		} else {
			next();
		}
	};
}

module.exports = {
	name: 'bender-middleware-jobs',
	create: create
};
