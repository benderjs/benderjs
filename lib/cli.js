'use static';

var scmd = require( 'subcommander' ),
	constants = require( './constants' ),
	main = require( './main' );

scmd.scriptName( 'bender' );

// common command line options
scmd
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
scmd.command( 'clean', {
	callback: main.clean,
	desc: 'Clean all Bender.js local files except the configuration'
} );


// init command
scmd.command( 'init', {
	callback: main.initialize,
	desc: 'Initialize Bender.js for this directory'
} );

// run command
scmd.command( 'run', {
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
var serverCmd = scmd.command( 'server', {
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
	callback: main.runServer,
	desc: 'Run the server in a verbose mode'
} );

// version command
scmd.command( 'version', {
	callback: function() {
		console.log( 'Bender.js v%s', constants.VERSION );
	},
	desc: 'Print Bender.js version'
} );

scmd.parse();
