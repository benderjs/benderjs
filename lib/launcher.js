/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Launches and lists available web browsers
 */

'use strict';

var bl = require( 'browser-launcher2' ),
	_ = require( 'lodash' ),
	logger = require( './logger' ).create( 'launcher', true );

/**
 * @module launcher
 */
module.exports = {
	name: 'launcher',

	/**
	 * Attach the module to Bender
	 */
	attach: function() {
		logger.debug( 'attach' );

		var bender = this;

		bender.checkDeps( module.exports.name, 'browsers' );

		var launcher = bender.launcher = {};

		/**
		 * List available browsers
		 */
		launcher.list = function() {
			logger.debug( 'list' );

			bl( function( err, launcher ) {
				logger.info( 'Available browsers:\n' + launcher.browsers.map( function( browser ) {
					return '- ' + browser.name + ' ' + browser.version;
				} ).join( '\n' ) + '\n' );
			} );
		};

		/**
		 * Launch a specific browser
		 * @param  {String}   browser  Browser name
		 * @param  {Function} callback Callback funcion called when succesuflly started a browser
		 * @todo Promisify
		 */
		launcher.launch = function( browser, callback ) {
			logger.debug( 'launch', browser );

			bl( function( err, launcher ) {
				if ( err ) {
					logger.error( err );
					return bender.emit( 'browser:stopped' );
				}

				// optional configuration for a browser taken from the bender.js configuration file
				var conf = bender.conf.startBrowserOptions && bender.conf.startBrowserOptions[ browser ] || {};

				browser = bender.browsers.parseBrowser( browser );

				var config = _.extend( {
					browser: browser.name + ( browser.version !== 0 ? '/' + browser.version : '' )
				}, conf );

				launcher( bender.conf.address + '/capture', config, function( err, instance ) {
					var captureTimeout;

					if ( err ) {
						logger.error( err );
						process.exit( 1 );
					}

					function startCaptureTimeout() {
						captureTimeout = setTimeout( function() {
							logger.error( 'Client capture timeout' );
							instance.stop();
						}, bender.conf.captureTimeout );
					}

					startCaptureTimeout();

					bender.on( 'client:afterRegister', function( client ) {
						if ( client.browser === browser.name &&
							( !browser.version || client.version === browser.version ) ) {
							clearTimeout( captureTimeout );
						}
					} );

					bender.on( 'client:disconnect', function( client ) {
						if ( client.browser === browser.name &&
							( !browser.version || client.version === browser.version ) &&
							!bender.browsers.clients.find( 'browser', client.browser ).length ) {
							startCaptureTimeout();
						}
					} );

					if ( typeof callback == 'function' ) {
						callback( instance );
					}
				} );
			} );
		};
	}
};
