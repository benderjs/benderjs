/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Creates Winston logger instances
 */

'use strict';

var winston = require( 'winston' ),
	_ = require( 'lodash' ),
	common = require( 'winston/lib/winston/common' ),
	defaults = {
		console: {
			colorize: true
		}
	},
	oldLog = common.log;

/**
 * Parse message meta object
 * see: https://github.com/flatiron/winston/issues/280
 * @param  {Object} obj Meta object
 * @return {String}
 * @private
 */
function parseMeta( obj ) {
	if ( obj instanceof Error ) {
		return obj.stack;
	}

	if ( obj instanceof Date || obj instanceof RegExp ) {
		return obj.toString();
	}

	if ( _.isEmpty( obj ) ) {
		return null;
	}

	return JSON.stringify( obj );
}

// override log method
common.log = function( options ) {
	/* istanbul ignore else */
	if ( _.isObject( options.meta ) ) {
		options.meta = parseMeta( options.meta );
	}

	return oldLog( options );
};

// register a common logger
winston.loggers.add( 'common', defaults );

/**
 * @module logger
 */
module.exports = winston.loggers.get( 'common' );

/**
 * Create and return an instance of Winston logger
 * @param  {String}  name       Logger name
 * @param  {Object}  [options]  Logger configuration object
 * @param  {Boolean} [useLabel] Should logs be labeled with logger name
 * @return {Object}
 */
module.exports.create = function( name, options, useLabel ) {

	if ( typeof options == 'boolean' ) {
		useLabel = options;
		options = {};
	}

	winston.loggers.add(
		name,
		_.merge( {
			console: {
				label: useLabel && name
			}
		}, defaults, options )
	);

	return winston.loggers.get( name );
};

module.exports.name = 'logger';

/**
 * Default logger configurations
 * @type {Object}
 */
module.exports.defaults = defaults;

module.exports.attach = function() {
	/**
	 * Logger manager
	 * @type {module:logger}
	 * @memberOf module:bender
	 * @name logger
	 */
	this.logger = module.exports;
};

/**
 * Set logger level to debug
 * @param {Boolean} doDebug Enable debug level flag
 */
module.exports.setDebug = function( doDebug ) {
	defaults.console.level = doDebug ? 'debug' : 'info';
};
