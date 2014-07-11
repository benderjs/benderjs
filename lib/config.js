/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages configuration files
 */

'use strict';

var fs = require( 'graceful-fs' ),
	path = require( 'path' ),
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
 * Parse configuration file located under given path
 * @param  {Boolean} [strict] Run in strict mode - causing process to exit on errors
 * @return {Config}
 */
Config.prototype.parse = function( strict ) {
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
	 * Attach module to Bender
	 */
	attach: function( options ) {
		var bender = this;

		/**
		 * Load and parse configuration file located under given path,
		 * also merge the configuration from the global configuration
		 */
		function load( configPath ) {
			var projectConfig = new Config( configPath ).parse( true ),
				userHome = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE,
				globalConfig = userHome ? new Config(
					path.resolve( userHome, '.bender/' + constants.CONFIG_NAME )
				).parse() : {},
				localConfig = new Config(
					path.resolve( '.bender/' + constants.CONFIG_NAME )
				).parse();

			return _.merge( {}, globalConfig, projectConfig, localConfig, function( dest, src ) {
				// override arrays instead of merging
				return Array.isArray( dest ) ? src : undefined;
			} );
		}

		/**
		 * Recursively populates the instance with the default values taken from the
		 * properties. This function does not return anything since it modifies
		 * the instance argument.
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

		/**
		 * Build a list of test base paths defined in configuration
		 * @param {Object} config Bender config
		 * @returns {Array}
		 */
		function buildBasePaths( config ) {
			var result = [];

			_.forOwn( config.tests, function( group ) {
				if ( result.indexOf( group.basePath ) == -1 ) {
					result.push( group.basePath );
				}
			} );

			return result;
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

		bender.conf.basePaths = buildBasePaths( bender.conf );

		bender.conf.needsBasePath = bender.conf.basePaths.length > 0;
	}
};
