/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Bender server daemon monitor
 */

var forever = require( 'forever' ),
	path = require( 'path' ),
	fs = require( 'graceful-fs' ),
	utile = require( 'utile' ),

	pidFile = path.resolve( '.bender/bender.pid' ),
	logFile = path.resolve( '.bender/bender-out.log' ),
	errorLogFile = path.resolve( '.bender/bender-err.log' ),

	started = false;

/**
 * Write a PID file
 * @param {Number} pid PID
 */
function writePid( pid ) {
	fs.writeFileSync( pidFile, pid, 'utf8' );
}


/**
 * Clean up the PID file
 */
function cleanUp() {
	try {
		fs.unlinkSync( pidFile );
	} catch ( e ) {}
}

/**
 * Start the server daemon monitor
 * @param {Object} data      Configuration data
 * @param {Array}  data.args Command line arguments
 * @param {String} data.cwd  Current working directory
 */
function start( data ) {
	var monitor = new forever.Monitor( process.argv[ 2 ], {
		max: 1,
		silent: false,
		fork: true,
		outFile: logFile,
		errFile: errorLogFile,
		pidFile: pidFile,
		options: data.args,
		cwd: data.cwd,
		uid: utile.randomString( 4 ).replace( /^\-/, '_' ),
		env: {
			BENDER_RUN: 1
		}
	} );

	monitor.on( 'message', function( msg ) {
		forever.startServer( monitor );
		writePid( monitor.child.pid );

		process.send( msg );
		process.disconnect();
	} );

	monitor.on( 'restart', function() {
		writePid( monitor.child.pid );
	} );

	monitor.on( 'error', function( err ) {
		console.error( 'Server daemon error:', err );
		cleanUp();
		process.exit( 1 );
	} );

	monitor.on( 'exit:code', function stop( code ) {
		console.error( 'Server daemon stopped with code:', code );
		cleanUp();
		process.exit( code || 1 );
	} );

	monitor.start();
}

process.on( 'message', function( data ) {
	if ( !started ) {
		start( JSON.parse( data ) );
		started = true;
	}
} );
