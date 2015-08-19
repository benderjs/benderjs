/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Bender main file
 * @module main
 */

'use strict';

var path = require( 'path' ),
	fs = require( 'graceful-fs' ),
	spawn = require( 'child_process' ).spawn,
	when = require( 'when' ),
	whenCb = require( 'when/callbacks' ),
	whenNode = require( 'when/node' ),
	whenFs = whenNode.liftAll( fs ),
	broadway = require( 'broadway' ),
	forever = require( 'forever' ),
	rimraf = require( 'utile' ).rimraf,
	chalk = require( 'chalk' ),

	addrFile = path.resolve( '.bender/address.dat' ),

	conf = require( './config' ),
	constants = require( './constants' ),
	logger = require( './logger' ),

	consoleReporter = require( './reporters/console' ),
	dotReporter = require( './reporters/dot' ),

	log = logger.create( 'cli' ),

	binary = path.resolve( __dirname, './cli.js' );


/**
 * Remove all files from .bender/ directory except bender.js configuration file
 * @memberOf module:main
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


/**
 * Initialize Bender in the current directory
 * @memberOf module:main
 */
function initialize() {
	var defaultConfig = buildDefaultConfig();

	// build the default configuration file from the schema
	function buildDefaultConfig() {
		var schema = require( '../lib/config-schema.js' ),
			example = [ '/**', ' * Bender configuration file', ' * ' ],
			props = schema.properties,
			keys = Object.keys( props ),
			longest = 0;

		longest = Math.max.apply( Math, keys.map( function( key ) {
			return key.length;
		} ) );
		longest = longest + 4 - ( longest % 4 );

		// create a documentation for configuration options
		keys.forEach( function addParam( name ) {
			var type = props[ name ].type,
				line;

			type = type.charAt( 0 ).toUpperCase() + type.slice( 1 );

			line = ' * @param {' + type + '}' + new Array( 8 - type.length + 2 ).join( ' ' ) + name;
			line += ( new Array( longest - name.length ).join( ' ' ) ) + props[ name ].description;

			if ( schema.required.indexOf( name ) > -1 ) {
				line += ' (Required)';
			}

			example.push( line );
		} );

		example.push(
			' */\n', 'var config = {', '\t// put your configuration here',
			'};\n', 'module.exports = config;'
		);

		return example.join( '\n' );
	}

	// create a configuration file containing the default options
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
		// create a local configuration file
		.then( function() {
			return createConfig( '.bender/' + constants.CONFIG_NAME );
		} )
		// create a project configuration file
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
 * Run an instance of a browser and execute tests on it
 * @param {Object} options Command line options and arguments
 * @memberOf module:main
 */
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

		loadModules( bender, modules );

		bender.init( function( err ) {
			if ( err ) {
				log.error( err );
				process.exit( 1 );
			}

			bender.launcher.list();
		} );

		return;
	}

	// start a HTTP server using in-memory databases
	function initBenderIMDB() {
		return whenCb.call( initBender, options, {
			database: {
				inMemory: true
			}
		} );
	}

	// initialize Bender and start tests in a browser instance
	function initAndRunTests( bender ) {
		var testId = options[ 0 ],
			browser = options.browser || bender.conf.startBrowser,
			ext;

		bender.browsers.build( [ browser ] );

		// use dot reporter for a shorter output
		bender.plugins.add( dotReporter );

		// remove the extension from the given ID
		if ( ( ext = path.extname( testId ) ) && ext === '.js' || ext === '.html' ) {
			testId = testId.replace( new RegExp( ext + '$' ), '' );
		}

		// start a new job and run it on a browser instance
		function startTests( tests ) {
			var exitCode = 1;

			tests = ( Array.isArray( tests ) ? tests : [ tests ] ).map( function( test ) {
				return test.id;
			} );

			// create a new job
			bender.jobs.create( {
				browsers: [ browser ],
				description: 'bender run job',
				filter: '',
				snapshot: false,
				tests: tests
			} );

			// launch a browser
			bender.launcher.launch( browser, function( instance ) {
				// pass all the messages from the instance to Bender's STDOUT to help debugging
				if ( browser.toLowerCase() === 'phantomjs' ) {
					instance.stdout.pipe( process.stdout );
				}

				// exit Bender when the instance stops
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

				// stop the instance when the job is done
				bender.on( 'job:complete', function( id, status ) {
					exitCode = status === bender.jobs.STATUS.PASSED ||
						status === bender.jobs.STATUS.IGNORED ? 0 : 1;
					instance.stop();
				} );
			} );
		}

		// handle test run errors
		function handleTestQueueError( err ) {
			log.error( 'Error while building test queue:' );
			if ( err.code === 'ENOENT' ) {
				log.error( 'No test(s) found.' );
			} else {
				log.error( err );
			}
			// exit on error
			process.exit( 1 );
		}

		// if no test ID was specified, run all the available tests
		var getTest = testId ? bender.tests.get( testId ) : bender.tests.list();

		getTest.done( startTests, handleTestQueueError );
	}

	createBenderDir()
		.then( initBenderIMDB )
		.done( initAndRunTests );
}


/**
 * Restart the server daemon
 * @param {Object} options Command line options and arguments
 * @memberOf module:main
 */
function serverRestart( options ) {
	getMeta( function( meta ) {
		if ( meta ) {
			forever.stop( meta.uid )
				.on( 'stop', function() {
					log.info( 'Bender server stopped successfully' );
					startDaemon( meta.cwd );
				} );
		} else {
			log.error(
				options[ 0 ] ?
				'Couln\'t find specified Bender server daemon' :
				'Couln\'t find Bender server daemon running in this folder'
			);
		}
	}, options[ 0 ] );
}


/**
 * Run the server in a verbose mode
 * @param {Object} options Command line options and arguments
 * @memberOf module:main
 */
function serverRun( options ) {
	createBenderDir()
		.then( function() {
			return whenCb.call( initBender, options, {} );
		} )
		.then( function( bender ) {
			// load standard console reporter
			bender.plugins.add( consoleReporter );
		} );
}


/**
 * Start the server daemon
 * @memberOf module:main
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
 * Display the server daemon's status
 * @memberOf module:main
 */
function serverStatus() {
	getMeta( function( meta ) {
		if ( meta ) {
			var file = path.join( meta.cwd, '.bender/address.dat' ),
				addr;

			try {
				addr = fs.readFileSync( file );
			} catch ( e ) {
				log.error( 'Couldn\'t open address file', file );
			} finally {
				addr = addr ? addr.toString() : 'unknown';
			}

			log.info( 'Bender server is running at: %s, uptime: %s', addr, uptime( meta.ctime ) );
		} else {
			log.error( 'Bender server is not running in this diretory' );
		}
	} );
}


/**
 * Stop the server daemon
 * @param {Object} options Command line options and arguments
 * @memberOf module:main
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
 * List running Bender servers daemons
 * @memberOf module:main
 */
function serverList() {
	forever.list( false, function( err, list ) {
		function filterBenderProcesses( item ) {
			return ( /\/benderjs\/lib\/cli.js$/i ).test( item.file );
		}

		if ( err || !list || !( list = list.filter( filterBenderProcesses ) ).length ) {
			log.info( 'There are no Bender server daemons running' );
			return;
		}

		var longest = list.reduce( function( r, c ) {
			return c.cwd.length > r ? c.cwd.length : r;
		}, 0 );

		log.info( 'Bender servers running:' );
		log.info( chalk.blue( 'uid   running  uptime        directory' +
			new Array( longest - 6 ).join( ' ' ) + 'address' ) );

		list.forEach( function( item ) {
			var file = path.join( item.cwd, '.bender/address.dat' ),
				addr;

			if ( item.cwd.length < longest ) {
				item.cwd += new Array( longest - item.cwd.length + 1 ).join( ' ' );
			}

			item.running = item.running ?
				chalk.green( item.running + '   ' ) :
				chalk.red( item.running + '  ' );

			// read the address file to get the actual Bender server address for this process
			try {
				addr = fs.readFileSync( file );
			} catch ( e ) {
				log.error( 'Couldn\'t open address file', file );
			} finally {
				addr = addr ? addr.toString() : 'unknown';
			}

			log.info(
				'%s  %s  %s  %s  %s',
				item.uid,
				item.running,
				chalk.yellow( uptime( item.ctime ) ),
				chalk.grey( item.cwd ),
				addr
			);
		} );
	} );
}

// expose public methods
module.exports = {
	clean: clean,
	initialize: initialize,
	runTests: runTests,
	serverList: serverList,
	serverRestart: serverRestart,
	serverRun: serverRun,
	serverStart: serverStart,
	serverStatus: serverStatus,
	serverStop: serverStop
};



/**
 * Get the metadata for a child process
 * @param {Function} callback Function called when done
 * @param {String}   [uid]    Process UID
 * @private
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
 * @param {String} [cwd] Optional CWD for a starting daemon
 * @private
 */
function startDaemon( cwd ) {
	var daemon = path.resolve( __dirname, 'daemon.js' ),
		args = process.argv.slice( 2 ),
		logFile = fs.openSync( '.bender/bender-debug.log', 'a' ),
		child = spawn( process.execPath, [ daemon, binary ], {
			stdio: [ 'ipc', logFile, logFile ],
			cwd: cwd,
			detached: true
		} );

	child.on( 'error', function( err ) {
		log.error( 'Server daemon thrown an error:', err );
	} );

	child.on( 'exit', function() {
		log.error( 'Couldn\'t start the server daemon, please check log files' );
	} );

	child.on( 'message', function( msg ) {
		log.info( 'Started Bender server daemon with address:', msg );

		// remove temporary log file
		try {
			fs.unlinkSync( 'bender-debug.log' );
		} catch ( e ) {}

		child.disconnect();
		child.unref();
	} );

	args[ 1 ] = 'run';
	child.send( JSON.stringify( {
		cwd: cwd,
		args: args
	} ) );
}


/**
 * Start Bender server
 * @param {Object} options    Command line options and arguments
 * @param {Object} config     Module configurations
 * @param {Function} callback A callback called with created Bender instance or error
 * @private
 */
function initBender( options, config, callback ) {
	/**
	 * @module bender
	 */
	var bender = new broadway.App( {
			delimeter: ':'
		} ),
		modules = [
			'logger', 'utils', 'constants', 'database', 'files', 'browsers', 'plugins', 'launcher',
			'applications', 'testbuilders', 'pagebuilders', 'tests', 'jobs', 'template', 'sockets',
			'middlewares', 'server'
		];

	// delete old address file
	try {
		fs.unlinkSync( addrFile );
	} catch ( e ) {}

	bender.use( conf, {
		path: path.resolve( options.config )
	} );

	if ( options.debug ) {
		logger.setDebug( true );
		Error.stackTraceLimit = 1000;
	}

	loadModules( bender, modules, config );

	bender.plugins.load();

	/**
	 * Gracefully stop the application after detaching all the plugins
	 * @param {Function} callback Completion callback
	 * @memberOf module:bender
	 * @method stop
	 */
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

	// initialize Bender application
	bender.init( function( err ) {
		var conf = bender.conf;

		if ( err ) {
			log.error( err );
			process.exit( 1 );
		}

		conf.port = options.port || conf.port || constants.PORT;
		conf.hostname = options.hostname || conf.hostname || constants.HOSTNAME;
		conf.address = ( conf.secure ? 'https://' : 'http://' ) + conf.hostname + ':' + conf.port;

		bender.server.create().done( function( server ) {
			server.listen( conf.port, conf.hostname, onListen ).on( 'error', onError );

			// callback called when a HTTP server starts listening
			function onListen() {
				log.info(
					'Bender.js v%s Server started at %s',
					constants.VERSION,
					conf.address
				);

				// attach Web Socket server to the existing HTTP server
				bender.sockets.attach( server );

				// store final server address in a file
				fs.writeFileSync( addrFile, conf.address );

				// send server address to the parent process - daemon monitor
				if ( process.send ) {
					process.send( conf.address );
				}

				if ( typeof callback == 'function' ) {
					callback( bender );
				}
			}

			// callback called when an error occurs while setting up a HTTP server
			function onError( err ) {
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
			}
		}, function( err ) {
			log.error( err );
		} );
	} );
}


/**
 * Load modules in the given Bender instance
 * @param  {broadway.App}   bender    Instance of Bender application
 * @param  {Array.<Strong>} modules   Array of module names
 * @param  {Object}         [config]  Configuration object
 * @private
 */
function loadModules( bender, modules, config ) {
	modules.forEach( function( module ) {
		module = require( './' + module );
		bender.use( module, config && module.name && config[ module.name ] );
	} );
}


/**
 * Create a directory for Bender's local resources
 * @return {Promise}
 * @private
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
 * Produce a formatted uptime string for a given timestamp
 * @param  {Number} timestamp Timestamp in ms
 * @return {String}
 * @private
 */
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
	ms = Math.floor( ms / 100 );

	function pad( n ) {
		return ( n < 10 ? '0' : '' ) + n;
	}

	return [ d, pad( h ), pad( m ), pad( s ) + '.' + ms ].join( ':' );
}
