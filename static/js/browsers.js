/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @module App.Browsers
 */

App.module( 'Browsers', function( Browsers, App, Backbone ) {
	'use strict';

	/**
	 * Router for Browsers module
	 */
	Browsers.Router = Marionette.AppRouter.extend( {
		name: 'browsers',

		appRoutes: {
			'browsers': 'show'
		}
	} );

	/**
	 * Browser model
	 */
	Browsers.Browser = Backbone.Model.extend( {
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
	 */
	Browsers.BrowserView = Marionette.ItemView.extend( {
		template: '#browser',
		tagName: 'tr',

		templateHelpers: {
			formatName: function( name, version ) {
				name = name === 'ie' ? 'IE' : name.charAt( 0 ).toUpperCase() + name.slice( 1 );

				return name + ( version ? ' ' + version : '' );
			}
		},

		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
		}
	} );

	/**
	 * Browser collection
	 */
	Browsers.browsersList = new( Backbone.Collection.extend( {
		model: Browsers.Browser
	} ) )();

	/**
	 * Browser list view
	 */
	Browsers.BrowsersListView = App.Common.TableView.extend( {
		template: '#browsers',
		childView: Browsers.BrowserView
	} );

	/**
	 * Browser module controller
	 * @type {Object}
	 */
	Browsers.controller = {
		show: function() {
			App.header.empty();

			App.content.show( new Browsers.BrowsersListView( {
				collection: Browsers.browsersList
			} ) );
		},

		parseBrowsers: function( data ) {
			var result = [],
				browser,
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

		updateBrowsers: function( data ) {
			Browsers.browsersList.reset( Browsers.controller.parseBrowsers( data ) );
		},

		clearBrowsers: function() {
			Browsers.browsersList.reset();
		},

		updateClient: function( data ) {
			var client = Browsers.browsersList.get( data.id );

			if ( client ) {
				client.set( data );
			}
		}
	};

	/**
	 * Add Browser module initializer
	 */
	Browsers.addInitializer( function() {
		var controller = Browsers.controller;

		Browsers.router = new Browsers.Router( {
			controller: controller
		} );

		App.Sockets.socket.on( 'browsers:update', controller.updateBrowsers );
		App.Sockets.socket.on( 'client:update', controller.updateClient );
		App.Sockets.socket.on( 'disconnect', controller.clearBrowsers );
	} );
} );
