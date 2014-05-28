App.module( 'Browsers', function( Browsers, App, Backbone ) {

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
	Browsers.BrowserView = Backbone.Marionette.ItemView.extend( {
		template: '#browser',
		tagName: 'tr',

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
	 * Browser list vieq
	 */
	Browsers.BrowsersListView = App.Common.TableView.extend( {
		template: '#browsers',
		itemView: Browsers.BrowserView
	} );

	/**
	 * Browser module controller
	 * @type {Object}
	 */
	Browsers.controller = {
		show: function() {
			App.header.close();

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
				delete browser.clients;

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

		App.Sockets.on( 'browsers:update', controller.updateBrowsers );
		App.Sockets.on( 'client:update', controller.updateClient );
		App.Sockets.on( 'disconnect', controller.clearBrowsers );
	} );
} );
