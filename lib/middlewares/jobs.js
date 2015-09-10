/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Serves job assets
 */

'use strict';

var path = require( 'path' ),
	parse = require( 'url' ).parse,
	send = require( 'send' ),
	ua = require( 'useragent' ),
	_ = require( 'lodash' ),
	logger = require( '../logger' ).create( 'middleware-jobs', true ),
	cwd = process.cwd();

/**
 * Create a HTTP handler serving job requests
 * @return {Function}
 * @memberOf module:middlewares/jobs
 */
function build( bender ) {
	return function( req, res, next ) {
		var parsed = parse( req.url ),
			url = req.url.substr( 1 ).split( '/' );


		function resume( err ) {
			/* istanbul ignore next */
			if ( err ) {
				if ( err.code !== 'ENOENT' ) {
					logger.error( err );
				}

				logger.debug( err );
			}

			next();
		}

		/* istanbul ignore if:not much to test */
		if ( url[ 0 ] !== 'jobs' ) {
			return resume();
		}

		function error( err ) {
			var msg = typeof err == 'string' ? err : err && err.message;

			logger.debug( msg );

			if ( msg === 'There\'s no such job.' ) {
				next();
			} else {
				res.writeHead( 500 );
				res.end( 'Internal Server Error: ' + msg );
			}
		}

		// handle specific job id
		function serveJob( job ) {
			var file,
				id,
				ext;

			// send a file located in the job's tests directory
			function sendTestAsset() {
				var jobFilePath = bender.utils.stripParams( path.join( cwd, '.bender/', url.join( '/' ) ) ),
					filePath = bender.utils.stripParams( path.join( cwd, url.slice( 3 ).join( '/' ) ) );

				if ( job.snapshot ) {
					bender.files.send( decodeURIComponent( jobFilePath ), req, res, filePath ).catch( resume );
				} else {
					bender.files.send( decodeURIComponent( filePath ), req, res, true ).catch( resume );
				}
			}

			// send job's application resources
			function sendApp() {
				bender.jobs.getApp( job._id, url[ 3 ] )
					.then( function( app ) {
						// no snapshot was taken or app uses a proxy
						if ( !app || !app.path ) {
							app = bender.applications.findOne( 'name', url[ 3 ] );


							if ( !app || !app.path ) {
								return resume();
							}
						}

						var jobFilePath = bender.utils.stripParams(
								path.join( cwd, '.bender/', url.join( '/' ) )
							),
							appFilePath = bender.utils.stripParams(
								path.join( cwd, [ app.path ].concat( url.slice( 4 ) ).join( '/' ) )
							);

						bender.files.send( decodeURIComponent( jobFilePath ), req, res, appFilePath, !job.snapshot ).catch( resume );
					} );
			}

			// send a file located in the job's directory, e.g. a coverage report
			function sendFile() {
				var filePath = bender.utils.stripParams( path.join( cwd, '.bender/', url.join( '/' ) ) );

				send( req, decodeURIComponent( filePath ) )
					.on( 'error', resume )
					.pipe( res );
			}

			// handle a job's task
			function handleTask( task ) {
				// no such task - try to send an asset then
				if ( !task ) {
					return sendTestAsset();
				}

				bender.template
					.build( _.extend( {
						snapshot: job.snapshot,
						ua: ua.parse( req.headers[ 'user-agent' ] )
					}, task ) )
					.done( function( content ) {
						bender.utils.renderHTML( res, content );
					}, resume );
			}

			// no such job - leave
			if ( !job ) {
				return resume();
			}

			// only a job ID is specified - get the job results and render them as JSON
			if ( !url[ 2 ] ) {
				return bender.jobs
					.get( job._id )
					.done( function( job ) {
						bender.utils.renderJSON( res, job );
					} );
			}

			// request for a test (task) or its asset
			if ( url[ 2 ] === 'tests' ) {
				// remove the query from a task/file name
				file = url.slice( 3 ).join( '/' ).split( '?' )[ 0 ];

				// remove the extension
				ext = path.extname( file );
				id = decodeURIComponent( ( ext === '.js' || ext === '.html' ) ? file.replace( ext, '' ) : file );

				// add query string to the task ID (e.g. used by jQuery plugin)
				if ( parsed.search ) {
					id += parsed.search;
				}

				// remove "&" at the end of the URL
				if ( id.substr( -1 ) === '&' ) {
					id = id.slice( 0, -1 );
				}

				bender.jobs
					.getTask( url[ 1 ], id )
					.done( handleTask, resume );
			} else if ( url[ 2 ] === 'apps' ) {
				sendApp();
			} else {
				sendFile();
			}
		}

		if ( req.method === 'GET' ) {
			// serve job details
			if ( url[ 1 ] ) {
				return bender.jobs
					.find( url[ 1 ] )
					.done( serveJob, resume );
			}

			// render a list of all jobs as JSON
			return bender.jobs
				.list()
				.done( function( jobs ) {
					bender.utils.renderJSON( res, {
						job: jobs
					} );
				}, resume );
		}


		if ( req.method === 'POST' ) {
			// recreate a job
			if ( url[ 1 ] && url[ 2 ] === 'recreate' ) {
				return bender.jobs
					.recreate( url[ 1 ], req.body.ids )
					.done( function() {
						bender.utils.renderJSON( res, {
							success: true,
							id: url[ 1 ]
						} );
					}, error );
			}

			// create a new job
			if ( req.url === '/jobs' ) {
				return bender.jobs
					.create( req.body )
					.done( function( id ) {
						bender.utils.renderJSON( res, {
							success: true,
							id: id
						} );
					}, error );
			}
		}

		// delete a job
		if ( req.method === 'DELETE' && url[ 1 ] ) {
			var ids = url[ 1 ].split( ',' );

			return bender.jobs
				.delete( ids )
				.done( function() {
					bender.utils.renderJSON( res, {
						success: true,
						id: ids
					} );
				}, error );
		}

		/* istanbul ignore else:not much to test here */
		// edit a job
		if ( req.method === 'PUT' && url[ 1 ] ) {
			return bender.jobs
				.edit( url[ 1 ], req.body )
				.done( function( job ) {
					bender.utils.renderJSON( res, job );
				}, error );
		}

		/* istanbul ignore next:not much to test here */
		resume();
	};
}

/**
 * @module middlewares/jobs
 */
module.exports = {
	name: 'bender-middleware-jobs',
	build: build
};
