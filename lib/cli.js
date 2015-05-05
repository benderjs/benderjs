/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Bender command line interface
 * @module cli
 */

'use static';

var scmd = require( 'subcommander' ),
	constants = require( './constants' ),
	main = require( './main' );

/**
 * Run the argument parser
 * @memberOf module:cli
 */
function run() {
	var parser = new scmd.Command();

	parser.scriptName( 'bender' );

	// a callback called when none of the commands was given
	parser.callback = function( parsed ) {
		if ( parsed.version ) {
			console.log( 'Bender.js v%s', constants.VERSION );
		} else {
			parser.usage();
		}
	};

	// common command line options
	parser
		.option( 'version', {
			abbr: 'v',
			desc: 'Print current Bender.js version',
			flag: true
		} )
		.option( 'port', {
			abbr: 'p',
			desc: 'Port on which the server will listen'
		} )
		.option( 'hostname', {
			abbr: 'H', // "h" is reserved for "help"
			desc: 'Hostname used to run the server'
		} )
		.option( 'config', {
			abbr: 'c',
			default: constants.CONFIG_NAME,
			desc: 'Alternative path to Bender.js configuration file'
		} )
		.option( 'debug', {
			abbr: 'd',
			desc: 'Enable debug logs',
			flag: true
		} );

	// clean command
	parser.command( 'clean', {
		callback: main.clean,
		desc: 'Clean all Bender.js local files except the configuration'
	} );

	// init command
	parser.command( 'init', {
		callback: main.initialize,
		desc: 'Initialize Bender.js for this directory'
	} );

	// run command
	parser.command( 'run', {
		callback: main.runTests,
		desc: 'Run the tests in a browser and output the results to the console'
	} )
	.option( 'browser', {
		abbr: 'b',
		desc: 'Browser to run the tests on'
	} )
	.option( 'list', {
		abbr: 'l',
		flag: true,
		desc: 'List all the available browsers'
	} );

	// server command
	var serverCmd = parser.command( 'server', {
		desc: 'Handle Bender.js server'
	} );

	// subcommands for the server command
	serverCmd.command( 'start', {
		callback: main.serverStart,
		desc: 'Start the server as a daemon'
	} );

	serverCmd.command( 'stop', {
		callback: main.serverStop,
		desc: 'Stop the server'
	} );

	serverCmd.command( 'status', {
		callback: main.serverStatus,
		desc: 'Show the server\'s status'
	} );

	serverCmd.command( 'restart', {
		callback: main.serverRestart,
		desc: 'Restart the server'
	} );

	serverCmd.command( 'list', {
		callback: main.serverList,
		desc: 'List running bender servers'
	} );

	serverCmd.command( 'run', {
		callback: main.serverRun,
		desc: 'Run the server in a verbose mode'
	} );

	// depricated version command
	parser.command( 'version', {
		callback: function() {
			console.log( 'Deprecated, please use -v/--version flag instead.' );
			console.log( 'Bender.js v%s', constants.VERSION );
		},
		desc: 'Print current Bender.js version [DEPRECATED]'
	} );

	parser.parse();
}

module.exports.run = run;

/* istanbul ignore next */
if ( process.env.BENDER_RUN ) {
	run();
}
