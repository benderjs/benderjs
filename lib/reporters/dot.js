/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Dot reporter - reports results as colored dots in the console
 */

'use strict';

var log = require( '../logger' ),
	chalk = require( 'chalk' ),
	errors = [],
	total = 0,
	passed = 0,
	failed = 0,
	ignored = 0,
	duration = 0;

function timeToText( ms ) {
	var h, m, s;

	s = Math.floor( ms / 1000 );
	ms %= 1000;
	m = Math.floor( s / 60 );
	s %= 60;
	h = Math.floor( m / 60 );
	m %= 60;

	return ( h ? ( h + 'h ' ) : '' ) +
		( m ? ( m + 'm ' ) : '' ) +
		( s ? ( s + 's ' ) : '' ) +
		ms + 'ms';
}

module.exports = {

	name: 'bender-reporter-dot',

	'client:result': function( data ) {
		var color = data.success ? data.ignored ? 'bgYellow' : 'reset' : 'bgRed';

		process.stdout.write( chalk[ color ]( '.' ) );

		total++;

		if ( data.success ) {
			if ( data.ignored ) {
				ignored++;
			} else {
				passed++;
			}
		} else {
			failed++;
			errors.push( data.module + ' - ' + data.error );
		}
	},

	'client:error': function( error ) {
		log.error( 'Test error:', error );
	},

	'client:complete': function( data ) {
		duration += data.duration;
	},

	'client:afterRegister': function( client ) {
		process.stdout.write( chalk.green( client.browser + client.version ) );
	},

	'client:disconnect': function( client ) {
		process.stdout.write( chalk.red( client.browser + client.version ) );
	},

	'job:complete': function() {
		process.stdout.write( '\n\n' );

		log.info(
			'Testing complete: %s total, %s passed, %s failed, %s ignored in %s',
			total, passed, failed, ignored, timeToText( duration )
		);

		errors.forEach( function( error, index ) {
			log.error( ( index + 1 ) + ') ' + error );
		} );
	}
};
