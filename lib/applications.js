/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages application resources required by tests
 */

'use strict';

var path = require( 'path' ),
	util = require( 'util' ),
	Collection = require( './collection' ),
	logger = require( './logger' );

/**
 * Application constructor
 * @param {String}         name            Application name
 * @param {Object}         options         Application configuration
 * @param {String}         [options.proxy] Application's URL to proxy into
 * @param {String}         [options.path]  Application's local directory
 * @param {String}         options.url     Application's url
 * @param {Array.<String>} options.files   Application files
 * @constructor
 */
function Application( name, options ) {
	if ( options.proxy ) {
		this.proxy = options.proxy;
	}
	if ( options.path ) {
		this.path = options.path;
	}

	this.name = name;
	this.url = path.normalize(
		( options.url || this.name ) + '/'
	).split( path.sep ).join( '/' );

	this.buildFiles( options.files );
}

/**
 * Build urls to application files that should be included in the test context
 * @param {Array.<String>} files Names of fiels to be included
 */
Application.prototype.buildFiles = function( files ) {
	var pattern = /\.(css|js)$/;

	this.js = [];
	this.css = [];

	files.forEach( function( file ) {
		var ext = pattern.exec( file );

		if ( ext ) {
			this[ ext[ 1 ] ].push(
				path.join( '/apps/', this.url, file ).split( path.sep ).join( '/' )
			);
		}
	}, this );
};



/**
 * Application collection
 * @extends {Collection}
 * @constructor
 */
function Applications() {
	Collection.call( this );
}

util.inherits( Applications, Collection );

/**
 * Build application collection based on configuration file
 */
Applications.prototype.build = function( conf ) {
	var name;

	if ( !conf.applications || typeof conf.applications != 'object' ) {
		return;
	}

	for ( name in conf.applications ) {
		this.add( name, new Application( name, conf.applications[ name ] ) );
	}
};

/**
 * @module applications
 */
module.exports = {

	name: 'applications',

	/**
	 * Attach module to Bender
	 */
	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'conf' );

		bender.applications = new Applications();
	},

	/**
	 * Initialize module
	 * @param  {Function} done Initialization completion callback
	 */
	init: function( done ) {
		var bender = this;

		bender.applications.build( bender.conf );
		done();
	}
};
