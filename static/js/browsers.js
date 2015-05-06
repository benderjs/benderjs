/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

/**
 * @module Browsers
 */
App.module( 'Browsers', function( Browsers, App, Backbone ) {
	'use strict';

	/**
	 * Router for Browsers module
	 * @constructor module:Browsers.BrowserRouter
	 * @extends {Marionette.AppRouter}
	 */
	Browsers.BrowserRouter = Marionette.AppRouter.extend( /** @lends module:Browsers.BrowserRouter.prototype */ {
		/**
		 * Router name
		 * @default
		 * @type {String}
		 */
		name: 'browsers',

		/**
		 * Routes
		 * @default
		 * @type {Object}
		 */
		appRoutes: {
			'browsers': 'showBrowsers'
		}
	} );

	/**
	 * Browser model
	 * @constructor module:Browsers.Browser
	 * @extends {Backbone.Model}
	 */
	Browsers.Browser = Backbone.Model.extend( /** @lends module:Browsers.Browser.prototype */ {
		/**
		 * Default values
		 * @default
		 * @type {Object}
		 */
		defaults: {
			id: '',
			name: '',
			addr: '',
			ua: '',
			version: '',
			ready: true,
			header: false
		}
	} );

	/**
	 * Browser view
	 * @constructor module:Browsers.BrowserView
	 * @extends {Marionette.ItemView}
	 */
	Browsers.BrowserView = Marionette.ItemView.extend( /** @lends module:Browsers.BrowserView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#browser',

		/**
		 * Tag name
		 * @default
		 * @type {String}
		 */
		tagName: 'tr',

		/**
		 * Template helpers
		 * @type {Object}
		 */
		templateHelpers: {
			/**
			 * Format a browser name
			 * @param  {String} name    Browser name
			 * @param  {Number} version Browser version
			 * @return {String}
			 */
			formatName: function( name, version ) {
				name = name === 'ie' ? 'IE' : name.charAt( 0 ).toUpperCase() + name.slice( 1 );

				return name + ( version ? ' ' + version : '' );
			}
		},

		/**
		 * Initialize the view
		 */
		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
		}
	} );

	/**
	 * Browser collection
	 * @constructor module:Browsers.BrowserList
	 * @extends {Backbone.Collection}
	 */
	Browsers.BrowserList = Backbone.Collection.extend( /** @lends module:Browsers.BrowserList.prototype */ {
		/**
		 * Collection model class
		 * @default
		 * @type {module:Browsers.Browser}
		 */
		model: Browsers.Browser
	} );

	/**
	 * Browser collection
	 * @memberOf module:Browsers
	 * @type {module:Browsers.BrowserList}
	 * @name browserList
	 */
	Browsers.browserList = new Browsers.BrowserList();

	/**
	 * Browser list view
	 * @constructor module:Browsers.BrowsersListView
	 * @extends {module:Common.TableView}
	 */
	Browsers.BrowsersListView = App.Common.TableView.extend( /** @lends module:Browsers.BrowsersListView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#browsers',

		/**
		 * Child item view
		 * @type {module:Browsers.BrowserView}
		 */
		childView: Browsers.BrowserView
	} );

	/**
	 * Browser controller
	 * @constructor module:Browsers.Controller
	 * @extends {Marionette.Controller}
	 */
	Browsers.Controller = Marionette.Controller.extend( {
		/**
		 * Show browser list
		 */
		showBrowsers: function() {
			App.header.empty();

			App.content.show( new Browsers.BrowsersListView( {
				collection: Browsers.browserList
			} ) );
		},

		/**
		 * Parse browser list
		 * @param  {Array} data Array of browsers
		 * @return {Array}
		 */
		parseBrowsers: function( data ) {
			var result = [],
				clients;

			_.each( data, function( browser ) {
				browser.header = true;

				clients = browser.clients;
				result.push( browser );

				_.each( clients, function( client ) {
					result.push( client );
				} );
			} );

			return result;
		},

		/**
		 * Update browser list
		 * @param {Array} data Array of browsers
		 */
		updateBrowsers: function( data ) {
			Browsers.browserList.reset( Browsers.controller.parseBrowsers( data ) );
		},

		/**
		 * Clear browser list
		 */
		clearBrowsers: function() {
			Browsers.browserList.reset();
		},

		/**
		 * Update a client
		 * @param {Object} data Client data
		 */
		updateClient: function( data ) {
			var client = Browsers.browserList.get( data.id );

			if ( client ) {
				client.set( data );
			}
		}
	} );

	/**
	 * Browser controller
	 * @memberOf module:Browsers
	 * @type {module:Browsers.Controller}
	 * @name controller
	 */
	Browsers.controller = new Browsers.Controller();

	/**
	 * Add Browser module initializer
	 */
	Browsers.addInitializer( function() {
		var controller = Browsers.controller;

		/**
		 * Browser router
		 * @memberOf module:Browsers
		 * @type {module:Browsers.BrowserRouter}
		 * @name browserRouter
		 */
		Browsers.browserRouter = new Browsers.BrowserRouter( {
			controller: controller
		} );

		App.Sockets.socket.on( 'browsers:update', controller.updateBrowsers );
		App.Sockets.socket.on( 'client:update', controller.updateClient );
		App.Sockets.socket.on( 'disconnect', controller.clearBrowsers );
	} );
} );
