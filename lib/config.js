/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages configuration files
 */

'use strict';

var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
	osenv = require( 'osenv' ),
	_ = require( 'lodash' ),
	tv4 = require( 'tv4' ),
	schema = require( './config-schema' ),
	constants = require( './constants' ),
	logger = require( './logger' ).create( 'config', true );

/**
 * Configuration constructor
 * @param {String} configPath Path to the configuration file
 * @constructor
 */
function Config( configPath ) {
	this.path = configPath;
}

/**
 * Parse the configuration file
 * @param  {Boolean} [strict] Run in the strict mode - causing process to exit on any error
 * @return {Config}
 */
Config.prototype.parse = function( strict ) {
	logger.debug( 'parse', this.path );

	var config;

	if ( !fs.existsSync( this.path ) ) {
		if ( !strict ) {
			return this;
		}

		logger.error( 'Configuration file not found: %s', this.path );
		process.exit( 1 );
	}

	try {
		config = require( this.path );
	} catch ( e ) {
		logger.error( 'Invalid configuration file: %s', this.path );
		process.exit( 1 );
	}

	_.merge( this, config );

	return this;
};

/**
 * @module config
 */
module.exports = {

	name: 'conf',

	/**
	 * Attach the module to Bender
	 */
	attach: function( options ) {
		logger.debug( 'attach' );

		var bender = this;

		/**
		 * Load and parse a configuration file located under given path,
		 * also merge the configuration with the global configuration
		 * @param {String} configPath Path to the configuration file
		 */
		function load( configPath ) {
			var projectConfig = new Config( configPath ).parse( true ),
				globalConfig = new Config(
					path.resolve( osenv.home(), '.bender/' + constants.CONFIG_NAME )
				).parse(),
				localConfig = new Config(
					path.resolve( '.bender/' + constants.CONFIG_NAME )
				).parse();

			return _.merge( {}, globalConfig, projectConfig, localConfig, function( dest, src ) {
				// override arrays instead of merging
				return Array.isArray( dest ) ? src : undefined;
			} );
		}

		/**
		 * Recursively populates the configuration instance with default values taken from the given
		 * properties. This function does not return anything since it modifies the given instance.
		 */
		function applyDefaultValues( instance, properties ) {
			if ( typeof instance === 'object' && typeof properties === 'object' ) {
				Object.keys( properties ).forEach( function( name ) {
					var schema = properties[ name ],
						value;

					if ( instance[ name ] === undefined &&
						( value = schema[ 'default' ] ) !== undefined ) {
						instance[ name ] = value;
					}

					applyDefaultValues( instance[ name ], schema.properties );
				} );
			}
		}

		bender.conf = load( options.path );

		applyDefaultValues( bender.conf, schema.properties );

		if ( !tv4.validate( bender.conf, schema ) ) {
			var msg = tv4.error.message;

			/* istanbul ignore if */
			if ( tv4.error.dataPath ) {
				msg += ' in ' + tv4.error.dataPath;
			}

			msg += ' in Bender.js configuration file.';

			logger.error( msg );
			process.exit( 1 );
		}
	}
};
