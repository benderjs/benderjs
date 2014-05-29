"use strict";

/**
 * @file Manages clients connected to the server
 */
var util = require( 'util' ),
	ua = require( 'useragent' ),
	log = require( './logger' ).create( 'clients', true ),
	Collection = require( './collection' );

/**
 * Client browser
 * @param {Object} data        Client properties
 * @param {String} data.id     Client's unique ID
 * @param {String} data.addr   Client's IP address
 * @param {Object} data.parsed Client's parsed User Agent
 * @constructor
 */
function Client( data ) {
	this.ua = data.parsed.toString();
	this.browser = data.parsed.family.toLowerCase();
	this.version = data.parsed.major;
	this.addr = data.addr;
	this.id = data.id;
	this.ready = true;
}

/**
 * Browser family
 * @param {Object} data         Browser data
 * @param {String} data.id      Browser's ID
 * @param {String} data.name    Browser's name
 * @param {String} data.version Browser's version
 * @constructor
 */
function Browser( data ) {
	this.id = data.id;
	this.name = data.name;
	this.version = data.version;
	this.clients = new Collection();
}

/**
 * Return the browser and it's clients
 * @return {Object}
 */
Browser.prototype.get = function() {
	return {
		id: this.id,
		name: this.name,
		version: this.version,
		clients: this.clients.get()
	};
};

/**
 * @module browsers
 */
module.exports = {

	name: 'browsers',

	/**
	 * Attach module to Bender
	 */
	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'conf' );

		/**
		 * Browsers collection
		 * @extends {Collection}
		 * @constructor
		 */
		function Browsers() {
			Collection.call( this );

			this.clients = new Collection();
			this.unknown = new Collection();
		}

		util.inherits( Browsers, Collection );

		/**
		 * Get a browser
		 * @param  {String|Array.<String>} id Browser id(s)
		 * @return {Browser|Array.<Browser>}
		 */
		Browsers.prototype.get = function( id ) {
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

			result = this.list().map( function( name ) {
				return this.items[ name ].get();
			}, this );

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
		 * Build browsers collection based on configuration file
		 * @param {Object} config Parsed Bender configuration
		 */
		Browsers.prototype.build = function( config ) {
			var pattern = /^([a-z]+)(\d*)/i,
				match;

			config.browsers.forEach( function( browser ) {
				if ( ( match = pattern.exec( browser ) ) ) {
					this.add( browser, new Browser( {
						id: browser,
						name: match[ 1 ].toLowerCase(),
						version: match[ 2 ]
					} ) );
				}
			}, this );
		};

		/**
		 * Add a client to a browser
		 * @param {Object} data    Client data
		 * @param {String} data.id Client's unique ID
		 * @param {String} data.ua Client's User Agent
		 * @fires Browsers#change
		 */
		Browsers.prototype.addClient = function( data ) {
			var browsers,
				client;

			if ( !data.ua ) {
				return;
			}

			data.parsed = ua.parse( data.ua );
			client = new Client( data );

			// add client to a browser
			function handleBrowser( browser ) {
				if ( browser.version === data.parsed.major || !browser.version ) {
					browser.clients.add( data.id, client );
					return true;
				}
			}

			browsers = this.find( 'name', data.parsed.family.toLowerCase() );

			// add unknown browser to 'unknown' list
			if ( !browsers.length || !browsers.some( handleBrowser ) ) {
				this.unknown.add( data.id, client );
			}

			this.clients.add( data.id, client );

			this.emit( 'change', this.get() );
		};

		/**
		 * Remove browser client
		 * @param  {String} id Client's unique ID
		 * @fires Browsers#change
		 */
		Browsers.prototype.removeClient = function( id ) {
			this.each( function( browser ) {
				browser.clients.remove( id );
			} );

			this.unknown.remove( id );
			this.clients.remove( id );

			this.emit( 'change', this.get() );
		};

		/**
		 * Change client's ready state
		 * @param {String}  id    Client's unique ID
		 * @param {Boolean} [state] Ready state
		 */
		Browsers.prototype.setClientReady = function( id, state ) {
			var client = this.clients.findOne( 'id', id );

			if ( !client ) {
				return;
			}

			client.ready = state === undefined ? true : state;
			this.emit( 'client:change', client );
		};

		bender.browsers = new Browsers();
	},

	/**
	 * Initialize module
	 * @param  {Function} done Initialization completion callback
	 */
	init: function( done ) {
		var bender = this;

		bender.browsers.build( bender.conf );

		bender.browsers.on( 'change', function( browsers ) {
			bender.emit( 'browsers:change', browsers );
		} );

		bender.browsers.on( 'client:change', function( client ) {
			bender.emit( 'client:change', client );
		} );

		bender.on( 'client:register', bender.browsers.addClient.bind( bender.browsers ) );
		bender.on( 'client:disconnect', bender.browsers.removeClient.bind( bender.browsers ) );

		done();
	}
};
