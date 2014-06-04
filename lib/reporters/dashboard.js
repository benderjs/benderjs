/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Dashboard reporter - reports events to the dashboard
 */

'use strict';

var logger = require( '../logger' );

module.exports = {

	name: 'bender-reporter-dashboard',

	attach: function() {
		var bender = this,
			reporter;

		bender.checkDeps( module.exports.name, 'sockets' );

		reporter = {
			'browsers:change': function( browsers ) {
				bender.sockets.dashboards.json.emit( 'browsers:update', browsers );
			},

			'client:change': function( client ) {
				bender.sockets.dashboards.json.emit( 'client:update', client );
			}
		};

		bender.onAny( function() {
			if ( typeof reporter[ this.event ] == 'function' ) {
				reporter[ this.event ].apply( bender, arguments );
			}
		} );
	}
};
