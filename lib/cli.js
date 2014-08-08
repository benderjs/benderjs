#!/usr/bin/env node

/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Bender command line interface
 */

'use strict';

var path = require( 'path' ),
	fs = require( 'fs' ),
	when = require( 'when' ),
	whenCb = require( 'when/callbacks' ),
	whenNode = require( 'when/node' ),
	whenFs = whenNode.liftAll( fs ),
	broadway = require( 'broadway' ),
	forever = require( 'forever' ),
	rimraf = require( 'rimraf' ),

	dir = '../lib/',

	applications = require( dir + 'applications' ),
	browsers = require( dir + 'browsers' ),
	conf = require( dir + 'config' ),
	constants = require( dir + 'constants' ),
	jobs = require( dir + 'jobs' ),
	launcher = require( dir + 'launcher' ),
	logger = require( dir + 'logger' ),
	middlewares = require( dir + 'middlewares' ),
	pagebuilders = require( dir + 'pagebuilders' ),
	plugins = require( dir + 'plugins' ),
	queues = require( dir + 'queues' ),
	server = require( dir + 'server' ),
	sockets = require( dir + 'sockets' ),
	template = require( dir + 'template' ),
	testbuilders = require( dir + 'testbuilders' ),
	tests = require( dir + 'tests' ),
	utils = require( dir + 'utils' ),

	consoleReporter = require( dir + 'reporters/console' ),
	dotReporter = require( dir + 'reporters/dot' ),

	log = logger.create( 'cli' );

/**
 * Start the server daemon
 */
function serverStart() {
	getMeta( function( meta ) {
		if ( meta ) {
			log.info( 'Bender server is already running' );
		} else {
			startDaemon();
		}
	} );
}

/**
 * Stop the server daemon
 */
function serverStop() {
	forever.stop( __filename )
		.on( 'stop', function() {
			log.info( 'Bender server stopped successfully' );
		} )
		.on( 'error', function() {
			log.error( 'Bender server not running or user not authorized to stop it' );
		} );
}

/**
 * Display the server daemon's status
 */
function serverStatus() {
	getMeta( function( meta ) {
		if ( meta ) {
			log.info( 'Bender server is running since ' + new Date( meta.ctime ) );
		} else {
			log.error( 'Bender server is not running or user not authorized to see the status' );
		}
	} );
}


/**
 * Restart the server daemon
 */
function serverRestart() {
	getMeta( function( meta ) {
		if ( meta ) {
			forever.stop( __filename )
				.on( 'stop', function() {
					log.info( 'Bender server stopped successfully' );
					startDaemon();
				} );
		} else {
			startDaemon();
		}
	} );
}

/**
 * Run the server in a verbose mode
 * @param {Object} options Object containing command line arguments parsed with Subcommander
 */
function serverRun( options ) {
	createBenderDir()
		.then( function() {
			return whenCb.call( startServer, options );
		} )
		.then( function( bender ) {
			// load standard console reporter
			bender.plugins.add( consoleReporter );

			// prepare queues for all browsers defined in the configuration file
			bender.queues.buildQueues( bender.conf.browsers );

			// build queues of the remaining jobs' tasks
			bender.jobs.buildQueues()
				.then( function( queue ) {
					// feed the queues
					Object.keys( queue ).forEach( function( name ) {
						bender.queues.addTests( name, queue[ name ] );
					} );
				} );
		} );
}

/**
 * Get child process metadata
 * @param  {Function} callback Function called when done
 */
function getMeta( callback ) {
	forever.list( false, function( err, list ) {
		if ( err || !list ) {
			return callback( null );
		}

		list.some( function( meta ) {
			if ( meta.file === __filename ) {
				callback( meta );
				return true;
			}
		} );
	} );
}

/**
 * Restart this script as a deamon
 */
function startDaemon() {
	var opts, child;

	opts = process.argv.slice( 2 );
	opts[ 1 ] = 'run';

	child = forever.startDaemon( __filename, {
		max: 3,
		silent: false,
		outFile: 'bender-out.log',
		errFile: 'bender-err.log',
		options: opts
	} );

	child.on( 'error', function( err ) {
		log.error( 'child process error', err );
	} );

	child.on( 'exit', function() {
		log.error( 'child process exit after 3 retries' );
	} );

	log.info( 'Bender server started successfully' );
}

/**
 * Start bender server
 * @param  {Object} options Command line options
 */
function startServer( options, callback ) {
	var bender = new broadway.App( {
			delimeter: ':'
		} ),
		modules = [
			utils, constants, logger, browsers, plugins, launcher, applications, testbuilders,
			pagebuilders, middlewares, tests, jobs, template, sockets, server, queues
		];

	bender.use( conf, {
		path: path.resolve( options.config )
	} );

	modules.forEach( function( module ) {
		bender.use( module );
	} );

	bender.plugins.load();

	bender.init( function( err ) {
		if ( err ) {
			log.error( err );
			process.exit( 1 );
		}

		bender.conf.port = options.port || bender.conf.port || constants.PORT;
		bender.conf.hostname = options.hostname || bender.conf.hostname || constants.HOSTNAME;
		bender.conf.address = 'http://' + bender.conf.hostname + ':' + bender.conf.port;

		bender.server
			.create()
			.listen(
				bender.conf.port,
				bender.conf.hostname,
				function() {
					log.info(
						'Bender.js v%s Server started at %s',
						constants.VERSION,
						bender.conf.address
					);

					if ( typeof callback == 'function' ) {
						callback( bender );
					}
				} )
			.on( 'error', function( err ) {
				if ( err.code === 'EADDRINUSE' ) {
					log.error(
						'Address %s in use. Please try running Bender on a different port.',
						bender.conf.address
					);
					process.exit( 1 );
				}
			} );
	} );
}

function runTests( options ) {
	createBenderDir()
		.then( function() {
			return whenCb.call( startServer, options );
		} )
		.then( function( bender ) {
			var testId = options[ 1 ],
				browser = options.browser || bender.conf.startBrowser,
				exitCode = 1;

			bender.browsers.build( [ browser ] );

			// use dot reporter for shorter output
			bender.plugins.add( dotReporter );

			// build a queue for specified browser
			bender.queues.buildQueues( [ browser ] );

			// shut down bender when queues are done
			bender.on( 'queues:result', function( errors ) {
				exitCode = errors.length ? 1 : 0;
			} );

			// shut down bender when instance is stopped
			bender.on( 'browser:stopped', function() {
				process.exit( exitCode );
			} );

			// if no test ID specified, run all the tests available
			( testId ? bender.tests.get( testId ) : bender.tests.list() )
				.then( function( tests ) {
					tests = !Array.isArray( tests ) ? [ tests ] : tests;

					// feed the queue with test(s)
					bender.queues.addTests( browser, tests );

					// launch a browser
					bender.launcher.launch( browser );
				}, function( err ) {
					log.error( 'Error while building test queue:' );
					log.error( err.code === 'ENOENT' ? 'No test(s) found.' : String( err ) );
					// exit on error
					process.exit( 1 );
				} );
		} );
}

/**
 * create a directory for Bender's local resources
 * @return {Promise}
 */
function createBenderDir() {
	return whenCb
		.call( fs.exists, '.bender/' )
		.then( function( exists ) {
			if ( !exists ) {
				return whenFs.mkdir( '.bender/' );
			}
		} );
}

/**
 * Initialize Bender in current directory
 */
function initialize() {
	var defaultConfig = buildDefaultConfig();

	// build default configuration file from schema
	function buildDefaultConfig() {
		var schema = require( '../lib/config-schema.js' ),
			example = [ '/**', ' * Bender configuration file', ' * ' ],
			props = schema.properties,
			keys = Object.keys( props ),
			longest = 0;

		// create documentation for config option
		function addParam( name ) {
			var type = props[ name ].type,
				line;

			type = type.charAt( 0 ).toUpperCase() + type.slice( 1 );

			line = ' * @param {' + type + '}' + new Array( 8 - type.length + 2 ).join( ' ' ) + name;
			line += ( new Array( longest - name.length ).join( ' ' ) ) + props[ name ].description;

			if ( schema.required.indexOf( name ) > -1 ) {
				line += ' (Required)';
			}

			example.push( line );
		}

		longest = Math.max.apply( Math, keys.map( function( key ) {
			return key.length;
		} ) );
		longest = longest + 4 - ( longest % 4 );

		keys.forEach( addParam );

		example.push(
			' */\n', 'var config = {', '\t// put your configuration here',
			'};\n', 'module.exports = config;'
		);

		return example.join( '\n' );
	}

	// create Bender configuration file with default content
	function createConfig( file ) {
		return whenCb
			.call( fs.exists, file )
			.then( function( exists ) {
				if ( !exists ) {
					return whenFs.writeFile( file, defaultConfig );
				}
			} );
	}

	createBenderDir()
		.then( function() {
			return createConfig( '.bender/' + constants.CONFIG_NAME );
		} )
		.then( function() {
			return createConfig( constants.CONFIG_NAME );
		} )
		.done( function() {
			log.info( 'Created Bender configuration files' );
			process.exit( 0 );
		}, function( err ) {
			log.error( 'Error while initializing Bender', String( err ) );
			process.exit( 1 );
		} );
}

/**
 * Remove all files from .bender/ directory except bender.js configuration file
 */
function clean() {
	function remove( file ) {
		return file === constants.CONFIG_NAME ?
			when.resolve() :
			whenNode.call( rimraf, path.join( '.bender/', file ) );
	}

	whenFs.readdir( '.bender/' )
		.then( function( files ) {
			return when.map( files, remove );
		} )
		.done( function() {
			log.info( 'Removed Bender local files' );
		} );
}

module.exports = {
	runTests: runTests,
	initialize: initialize,
	clean: clean,
	serverStart: serverStart,
	serverStop: serverStop,
	serverStatus: serverStatus,
	serverRestart: serverRestart,
	serverRun: serverRun
};
