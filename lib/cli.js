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
	chalk = require( 'chalk' ),

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
 * @param {Object} options Command line options and arguments
 */
function serverStop( options ) {
	getMeta( function( meta ) {
		function error() {
			log.error( 'Bender server is not running in this directory' );
		}

		if ( !meta ) {
			return error();
		}

		forever.stop( meta.uid )
			.on( 'stop', function() {
				log.info( 'Bender server stopped successfully' );
			} )
			.on( 'error', error );
	}, options[ 0 ] );
}

/**
 * Display the server daemon's status
 */
function serverStatus() {
	getMeta( function( meta ) {
		if ( meta ) {
			log.info( 'Bender server is running since ' + new Date( meta.ctime ) );
		} else {
			log.error( 'Bender server is not running in this diretory' );
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
 * List running Bender servers
 */
function serverList() {
	forever.list( false, function( err, list ) {
		if ( err || !list ) {
			log.info( 'No running Bender server(s).' );
			return;
		}

		var longest = list.reduce( function( r, c ) {
			return c.cwd.length > r ? c.cwd.length : r;
		}, 0 );

		function uptime( timestamp ) {
			var ms = new Date() - timestamp,
				d, h, m, s;

			d = Math.floor( ms / ( 24 * 60 * 60 * 1000 ) );
			ms -= d * 24 * 60 * 60 * 1000;
			h = Math.floor( ms / ( 60 * 60 * 1000 ) );
			ms -= h * 60 * 60 * 1000;
			m = Math.floor( ms / ( 60 * 1000 ) );
			ms -= m * 60 * 1000;
			s = Math.floor( ms / 1000 );
			ms -= s * 1000;

			return [
				d, h, ( m < 10 ? '0' : '' ) + m, ( s < 10 ? '0' : '' ) + s + '.' + ms
			].join( ':' );
		}

		log.info( 'Bender servers running:' );
		log.info( chalk.blue( 'uid   directory' + new Array( longest - 6 ).join( ' ' ) + 'uptime' ) );
		list.forEach( function( item ) {
			if ( item.cwd.length < longest ) {
				item.cwd += new Array( longest - item.cwd.length + 1 ).join( ' ' );
			}

			log.info( '%s  %s  %s', item.uid, chalk.grey( item.cwd ), chalk.yellow( uptime( item.ctime ) ) );
		} );
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
 * @param {Function} callback Function called when done
 * @param {String}   [uid]    Process UID
 */
function getMeta( callback, uid ) {
	forever.list( false, function( err, list ) {
		if ( err || !list ) {
			return callback( null );
		}

		var meta = list.filter( function( item ) {
			if ( item.file === binary &&
				( uid ? item.uid === uid : item.cwd === process.cwd() ) ) {
				return item;
			}
		} )[ 0 ];

		callback( meta );
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
		var conf = bender.conf,
			server;

		if ( err ) {
			log.error( err );
			process.exit( 1 );
		}

		conf.port = options.port || conf.port || constants.PORT;
		conf.hostname = options.hostname || conf.hostname || constants.HOSTNAME;
		conf.address = 'http://' + conf.hostname + ':' + conf.port;

		server = bender.server.create();

		server.listen(
			conf.port,
			conf.hostname,
			function() {
				log.info(
					'Bender.js v%s Server started at %s',
					constants.VERSION,
					conf.address
				);

				// attach Web Socket server to the existing HTTP server
				bender.sockets.attach( server );

				if ( typeof callback == 'function' ) {
					callback( bender );
				}
			} )
			.on( 'error', function( err ) {
				if ( err.code === 'EADDRINUSE' || err.code === 'EACCES' ) {
					// no -p/--port was given
					if ( !options.port && ++conf.port < 65536 ) {
						log.warn(
							'Address %s in use - trying on a different port.',
							conf.address
						);
						conf.address = 'http://' + conf.hostname + ':' + conf.port;
						server.listen( conf.port, conf.hostname );
					} else {
						log.error(
							'Address %s in use. Please try running Bender on a different port.',
							conf.address
						);
						process.exit( 1 );
					}
				} else {
					log.error( err );
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
									log.error( err );
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
					if ( err.code === 'ENOENT' ) {
						log.error( 'No test(s) found.' );
					} else {
						log.error( err );
					}
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
			log.error( 'Error while initializing Bender', err );
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
	serverList: serverList,
	runServer: runServer
};
