/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages clients (browsers) connected to the server
 */

'use strict';

var util = require( 'util' ),
	ua = require( 'useragent' ),
	Collection = require( './collection' ),
	logger = require( './logger' ).create( 'browsers', true );

/**
 * Client browser
 * @param {Object} data        Client properties
 * @param {String} data.id     Client's unique ID
 * @param {String} data.addr   Client's IP address
 * @param {Object} data.parsed Client's parsed User Agent
 * @param {String} data.mode   Client's mode
 * @memberOf module:browsers
 * @constructor
 */
function Client( data ) {
	this.ua = data.parsed.toString();
	this.browser = data.parsed.family.toLowerCase();
	this.version = parseInt( data.parsed.major, 10 );
	this.addr = data.addr;
	this.id = data.id;
	this.mode = data.mode;
	this.ready = true;
}

/**
 * Browser family
 * @param {Object} data         Browser data
 * @param {String} data.id      Browser's ID
 * @param {String} data.name    Browser's name
 * @param {String} data.version Browser's version
 * @param {String} data.manual  Browser's support manual tests
 * @memberOf module:browsers
 * @constructor
 */
function Browser( data ) {
	this.id = data.id;
	this.name = data.name;
	this.version = data.version;
	this.clients = new Collection();
	this.manual = data.manual;
}

/**
 * Return a browser and matching clients
 * @return {Object}
 */
Browser.prototype.get = function() {
	return {
		id: this.id,
		name: this.name,
		version: this.version,
		manual: this.manual,
		clients: this.clients.get()
	};
};

/**
 * Browsers collection
 * @extends {module:collection.Collection}
 * @memberOf module:browsers
 * @constructor
 */
function Browsers() {
	Collection.call( this );

	this.clients = new Collection();
	this.unknown = new Collection();
}

util.inherits( Browsers, Collection );

/**
 * Build a browsers collection for the given browser list
 * @param {Object} browsers Array of browsers to build
 */
Browsers.prototype.build = function( browsers ) {
	logger.debug( 'build', JSON.stringify( browsers ) );

	browsers.forEach( function( browser ) {
		var data = this.parseBrowser( browser );

		if ( data && !this.has( browser ) ) {
			this.add( browser, new Browser( data ) );
		}
	}, this );
};

/**
 * Get a browser
 * @param  {String|Array.<String>} id Browser id(s)
 * @return {Browser|Array.<Browser>}
 */
Browsers.prototype.get = function( id ) {
	logger.debug( 'get', id || 'all' );

	var result;

	if ( typeof id == 'string' ) {
		return this.items[ id ];
	}

	if ( Array.isArray( id ) ) {
		return id.map( function( name ) {
			return this.items[ name ];
		}, this ).filter( function( item ) {
			return item !== undefined;
		} );
	}

	result = this.list()
		.map( function( name ) {
			return this.items[ name ].get();
		}, this )
		.sort( function( a, b ) {
			/* istanbul ignore next:not critical */
			return a.name > b.name ? 1 : a.name < b.name ? -1 :
				a.version > b.version ? 1 : a.version < b.version ? -1 : 0;
		} );

	// add unknown browsers at the end of the list
	if ( this.unknown.list().length ) {
		result = result.concat( [ {
			id: 'Unknown',
			name: 'unknown',
			clients: this.unknown.get()
		} ] );
	}

	return result;
};

/**
 * Remove a browser client
 * @param {Object} data Client's data
 * @fires module:browsers.Browsers#change
 */
Browsers.prototype.removeClient = function( data ) {
	logger.debug( 'removeClient', data );

	var id = data.id;

	this.each( function( browser ) {
		browser.clients.remove( id );
	} );

	this.unknown.remove( id );
	this.clients.remove( id );

	this.emit( 'change', this.get() );
};

/**
 * Change a client's ready state
 * @param {String}  id      Client's unique ID
 * @param {Boolean} [state] Ready state
 */
Browsers.prototype.setClientReady = function( id, state ) {
	logger.debug( 'setClientReady', id, state );

	var client = this.clients.findOne( 'id', id );

	if ( !client ) {
		return;
	}

	client.ready = state === undefined ? true : state;
	this.emit( 'client:change', client );
};

/**
 * Browser manager
 * @module browsers
 */
module.exports = {

	name: 'browsers',

	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'conf' );

		logger.debug( 'attach' );

		/**
		 * Parse a browser's ID and return an object containing a browser's name and version
		 * @param  {String} id Browser's ID
		 * @return {Object}
		 */
		Browsers.prototype.parseBrowser = function( id ) {
			logger.debug( 'parse', id );

			var pattern = /^([a-z]+)(\d*)$/i,
				match = pattern.exec( id );

			return match ? {
				id: id,
				name: match[ 1 ].toLowerCase(),
				version: match[ 2 ] && parseInt( match[ 2 ], 10 ) || 0,
				manual: bender.conf.manualBrowsers.indexOf( id ) > -1
			} : null;
		};

		/**
		 * Add a client to a browser
		 * @param {Object} data    Client data
		 * @param {String} data.id Client's unique ID
		 * @param {String} data.ua Client's User Agent
		 * @fires module:browsers.Browsers#change
		 * @fires module:bender#client:afterRegister
		 */
		Browsers.prototype.addClient = function( data ) {
			logger.debug( 'addClient', data );

			var browsers,
				client;

			if ( !data.ua ) {
				return;
			}

			data.parsed = ua.parse( data.ua );
			client = new Client( data );

			// add client to a browser
			function handleBrowser( browser ) {
				if ( browser.version === parseInt( data.parsed.major, 10 ) || !browser.version ) {
					browser.clients.add( data.id, client );
					return true;
				}
			}

			browsers = this.find( 'name', data.parsed.family.toLowerCase() );

			// add unknown browser to 'unknown' list
			if ( !browsers.length || !browsers.some( handleBrowser ) ) {
				this.unknown.add( data.id, client );
			} else {
				this.clients.add( data.id, client );
			}

			/**
			 * Client after registration event
			 * @event module:bender#client:afterRegister
			 * @type {module:browsers.Client}
			 */
			bender.emit( 'client:afterRegister', client );
			this.emit( 'change', this.get() );
		};

		/**
		 * Browsers collection
		 * @memberOf module:bender
		 * @type {module:browsers.Browsers}
		 * @name browsers
		 */
		bender.browsers = new Browsers();
	},

	init: function( done ) {
		var bender = this;

		logger.debug( 'init' );

		bender.browsers.build( bender.conf.browsers );

		// forward change events
		bender.browsers.on( 'change', function( browsers ) {
			/**
			 * Browser list change
			 * @event module:bender#browsers:change
			 * @type {module:browsers.Browsers}
			 */
			bender.emit( 'browsers:change', browsers );
		} );

		bender.browsers.on( 'client:change', function( client ) {
			/**
			 * Client change
			 * @event module:bender#client:change
			 * @type {module:browsers.Client}
			 */
			bender.emit( 'client:change', client );
		} );

		bender.on( 'client:register', bender.browsers.addClient.bind( bender.browsers ) );
		bender.on( 'client:disconnect', bender.browsers.removeClient.bind( bender.browsers ) );

		done();
	}
};
