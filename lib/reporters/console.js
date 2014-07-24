/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Console reporter - reports events to a console
 */

'use strict';

var log = require( '../logger' );

module.exports = {

	name: 'bender-reporter-console',

	'client:run': function( id, test ) {
		log.info( 'Client %s runs test %s', id, test.id );
	},

	'client:complete': function( data ) {
		log.info(
			'Client %s completed testing %s - %s',
			data.client.id,
			data.id,
			data.success ? data.ignored ? 'IGNORED' : 'PASSED' : 'FAILED'
		);

		if ( !data.success ) {
			Object.keys( data.results )
				.forEach( function( name ) {
					var result = data.results[ name ];

					if ( !result || result.success ) {
						return;
					}

					log.error( name, 'FAILED\n' + result.error );
				} );
		}
	},

	'client:log': function( msg ) {
		log.info( 'Test log:', msg );
	},

	'client:error': function( error ) {
		log.error( 'Test error:', error );
	},

	'client:register': function( client ) {
		log.info( 'Client connected:', client.id, client.ua );
	},

	'client:disconnect': function( client ) {
		log.info( 'Client disconnected:', client.id );
	},

	'dashboard:register': function( id ) {
		log.info( 'Dashboard connected:', id );
	},

	'dashboard:disconnect': function( id ) {
		log.info( 'Dashboard disconnected:', id );
	}
};
