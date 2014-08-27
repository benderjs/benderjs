#!/usr/bin/env node

/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Bender command line interface
 */

'use strict';

var path = require( 'path' ),
	fs = require( 'graceful-fs' ),
	when = require( 'when' ),
	whenCb = require( 'when/callbacks' ),
	whenNode = require( 'when/node' ),
	whenFs = whenNode.liftAll( fs ),
	broadway = require( 'broadway' ),
	forever = require( 'forever' ),
	rimraf = require( 'rimraf' ),

	dir = '../lib/',

	conf = require( dir + 'config' ),
	constants = require( dir + 'constants' ),
	logger = require( dir + 'logger' ),

	consoleReporter = require( dir + 'reporters/console' ),
	dotReporter = require( dir + 'reporters/dot' ),

	log = logger.create( 'cli' ),

	binary = path.resolve( __dirname, '../bin/bender' );

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
	forever.stop( binary )
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
			forever.stop( binary )
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
function runServer( options ) {
	createBenderDir()
		.then( function() {
			return whenCb.call( startServer, options, {} );
		} )
		.then( function( bender ) {
			// load standard console reporter
			bender.plugins.add( consoleReporter );
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
			if ( meta.file === binary ) {
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

	child = forever.startDaemon( binary, {
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
 * @param {Object} options Command line options
 * @param {Object} config  Module configurations
 */
function startServer( options, config, callback ) {
	var bender = new broadway.App( {
			delimeter: ':'
		} ),
		modules = [
			'logger', 'utils', 'constants', 'database', 'files', 'browsers', 'plugins', 'launcher',
			'applications', 'testbuilders', 'pagebuilders', 'tests', 'jobs', 'template', 'sockets',
			'middlewares', 'server'
		];

	bender.use( conf, {
		path: path.resolve( options.config )
	} );

	if ( options.debug ) {
		logger.setDebug( true );
	}

	modules.forEach( function( module ) {
		module = require( dir + module );
		bender.use( module, module.name && config[ module.name ] );
	} );

	bender.plugins.load();

	bender.stop = function( callback ) {
		var names = Object.keys( this.plugins ),
			that = this;

		function next( err ) {
			if ( err && callback ) {
				return callback.call( that, err );
			}

			var name = names.shift(),
				plugin;

			if ( name ) {
				if ( ( plugin = that.plugins[ name ] ) && plugin.detach ) {
					return plugin.detach.call( that, next );
				}
				next();
			} else if ( callback ) {
				callback.call( that );
			}
		}

		next();
	};

	bender.init( function( err ) {
		var server;

		if ( err ) {
			log.error( err );
			process.exit( 1 );
		}

		bender.conf.port = options.port || bender.conf.port || constants.PORT;
		bender.conf.hostname = options.hostname || bender.conf.hostname || constants.HOSTNAME;
		bender.conf.address = 'http://' + bender.conf.hostname + ':' + bender.conf.port;

		server = bender.server.create();

		server.listen(
			bender.conf.port,
			bender.conf.hostname,
			function() {
				log.info(
					'Bender.js v%s Server started at %s',
					constants.VERSION,
					bender.conf.address
				);

				// attach Web Socket server to the existing HTTP server
				bender.sockets.attach( server );

				if ( typeof callback == 'function' ) {
					callback( bender );
				}
			} )
			.on( 'error', function( err ) {
				if ( err.code === 'EADDRINUSE' ) {
					// no -p/--port was given
					if ( !options.port && ++bender.conf.port < 65536 ) {
						log.warn(
							'Address %s in use - trying on a different port.',
							bender.conf.address
						);
						bender.conf.address = 'http://' + bender.conf.hostname + ':' + bender.conf.port;
						server.listen( bender.conf.port, bender.conf.hostname );
					} else {
						log.error(
							'Address %s in use. Please try running Bender on a different port.',
							bender.conf.address
						);
						process.exit( 1 );
					}
				} else {
					log.error( String( err ) );
					process.exit( 1 );
				}
			} );
	} );
}

function runTests( options ) {
	// just list available browsers and leave
	if ( options.list ) {
		var bender = new broadway.App( {
				delimeter: ':'
			} ),
			modules = [ 'utils', 'browsers', 'launcher' ];

		bender.use( conf, {
			path: path.resolve( options.config )
		} );

		modules.forEach( function( module ) {
			bender.use( require( dir + module ) );
		} );

		bender.init( function( err ) {
			if ( err ) {
				log.error( err );
				process.exit( 1 );
			}

			bender.launcher.list();
		} );

		return;
	}

	createBenderDir()
		.then( function() {
			return whenCb.call( startServer, options, {
				database: {
					inMemory: true
				}
			} );
		} )
		.then( function( bender ) {
			var testId = options[ 0 ],
				browser = options.browser || bender.conf.startBrowser,
				ext;

			bender.browsers.build( [ browser ] );

			// use dot reporter for shorter output
			bender.plugins.add( dotReporter );

			// remove extension from the ID
			if ( ( ext = path.extname( testId ) ) && ext === '.js' || ext === '.html' ) {
				testId = testId.replace( new RegExp( ext + '$' ), '' );
			}

			// if no test ID specified, run all the tests available
			( testId ? bender.tests.get( testId ) : bender.tests.list() )
				.then( function( tests ) {
					var exitCode = 1;

					tests = ( Array.isArray( tests ) ? tests : [ tests ] ).map( function( test ) {
						return test.id;
					} );

					// create new job
					bender.jobs.create( {
						browsers: [ browser ],
						description: 'bender run job',
						filter: '',
						snapshot: false,
						tests: tests
					} );

					// launch a browser
					bender.launcher.launch( browser, function( instance ) {
						// exit bender when the instance stops
						instance.on( 'stop', function() {
							// detach all the plugins before exiting
							bender.stop( function( err ) {
								if ( err ) {
									log.error( String( err ) );
									process.exit( 1 );
								}

								process.exit( exitCode );
							} );
						} );

						// stop instance when the job is done
						bender.on( 'job:complete', function( id, status ) {
							exitCode = status === bender.jobs.STATUS.PASSED ||
								status === bender.jobs.STATUS.IGNORED ? 0 : 1;
							instance.stop();
						} );
					} );

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
	runServer: runServer
};
