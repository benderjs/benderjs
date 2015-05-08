/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

( function( window ) {
	'use strict';

	/**
	 * Marionette Application
	 * @module App
	 */
	window.App = new Marionette.Application();

	/**
	 * Navigate to a route
	 * @param {String}  route             Route to navigate to
	 * @param {Object}  [options]         Backbone.history.navigate options
	 * @param {Boolean} [options.trigger] Force triggering route event
	 * @param {Boolean} [options.replace] Replace current route with new one instead of adding another history item
	 * @memberOf module:App
	 */
	App.navigate = function( route, options ) {
		options = options || {
			trigger: true
		};

		Backbone.history.navigate( route, options );
	};

	/**
	 * Get current route
	 * @return {String}
	 * @memberOf module:App
	 */
	App.getCurrentRoute = function() {
		return Backbone.history.fragment;
	};

	/**
	 * Display the 'Error 404' page
	 * @memberOf module:App
	 */
	App.show404 = function() {
		App.header.empty();
		App.content.show( new App.Common.Error404View() );
	};

	/**
	 * Show confirmation popup
	 * @param {Object}   options          Modal configuration
	 * @param {String}   options.message  Modal message
	 * @param {Function} options.callback Callback function executed on modal confirmation
	 * @memberOf module:App
	 */
	App.showConfirmPopup = function( options ) {
		App.modal.show(
			new App.Common.ConfirmView( options )
		);
	};

	/**
	 * Show "server disconnected" popup
	 * @memberOf module:App
	 */
	App.showDisconnectedPopup = function() {
		App.modal.show(
			new App.Common.DisconnectedView()
		);
	};

	/**
	 * Hide "server disconnected" popup
	 * @memberOf module:App
	 */
	App.hideDisconnectedPopup = function() {
		if ( App.modal.currentView && App.modal.currentView.name === 'disconnected-modal' ) {
			App.modal.empty();
		}
	};

	/**
	 * Main layout region responsible for displaying dialog modals
	 * @constructor module:App.ModalRegion
	 * @extends {Marionette.Region}
	 */
	App.ModalRegion = Marionette.Region.extend( /** @lends module:App.ModalRegion.prototype */ {
		/**
		 * Region element selector
		 * @default
		 * @type {String}
		 */
		el: '#modal',

		/**
		 * Modal region constructor, binds to Bootstrap modal events
		 */
		constructor: function() {
			Marionette.Region.prototype.constructor.apply( this, arguments );

			this._ensureElement();
			this.$el.on( 'hidden.bs.modal', _.bind( this.empty, this ) );
		},

		/**
		 * Handle show event, display Bootstrap's backdrop
		 * @param {Object} view View
		 */
		onShow: function( view ) {
			view.once( 'destroy', _.bind( this.onEmpty, this ) );

			this.$el.modal( {
				backdrop: 'static',
				show: true
			} );

			this.$el.find( 'button' ).first().focus();
		},

		/**
		 * Handle empty event
		 */
		onEmpty: function() {
			this.$el.modal( 'hide' );
		}
	} );

	/**
	 * Setup application regions
	 * @type {String}
	 */
	App.addRegions( {
		socketStatus: '#socket-status',
		tabs: '#tabs',
		header: '#header',
		content: '#content',
		modal: App.ModalRegion,
		alerts: '#alerts'
	} );

	var currentHeader,
		headerTop = 0;

	// show/hide the fake fixed header depending on the document scroll position
	function toggleHeader() {
		var supportPageOffset = window.pageYOffset !== undefined,
			isCSS1Compat = ( ( document.compatMode || '' ) === 'CSS1Compat' );

		// pageYOffset is available
		if ( supportPageOffset ? window.pageYOffset :
			// standards-compliant mode is enabled
			isCSS1Compat ? document.documentElement.scrollTop :
			// otherwise use body.scrollTop
			document.body.scrollTop && currentHeader.hasClass( 'hidden' ) ) {
			currentHeader.removeClass( 'hidden' );
		} else {
			currentHeader.addClass( 'hidden' );
		}
	}

	// adjust body padding to match header height each time the content is changed
	App.addInitializer( function() {
		App.$body = $( 'body' );
		App.$navbar = $( '.navbar' );

		App.content.on( 'show', function() {
			App.trigger( 'header:update' );
			App.trigger( 'header:resize', App.$navbar.height() );
		} );

		// adjust body padding on window resize
		$( window ).bind( 'resize', function() {
			App.trigger( 'header:resize', App.$navbar.height() );
			toggleHeader();
		} );

		$( window ).bind( 'scroll', toggleHeader );
	} );

	// update the fake header's content
	App.on( 'header:update', function( contentOnly ) {
		var header = App.content.$el.find( '.fixed-header' );

		// just replace the contents of the header
		if ( contentOnly && currentHeader && header.length ) {
			return currentHeader.find( '.table' ).empty().append( header.clone() );
		}

		if ( currentHeader ) {
			currentHeader.remove();
		}

		if ( header.length ) {
			currentHeader = $( '<div class="fixed hidden"><div class="container"><div class="panel panel-default">' +
				'<table class="table"></table></div></div></div>' );

			currentHeader.find( '.table' ).append( header.clone() );
			currentHeader.appendTo( 'body' );
		} else {
			currentHeader = null;
		}
	} );

	// adjust document.body's top padding and fake header's position
	App.on( 'header:resize', function( height ) {
		height = height !== undefined ? height : App.$navbar.height();

		App.$body.css( 'paddingTop', height + 1 + 'px' );

		if ( currentHeader && headerTop !== height + 1 ) {
			headerTop = height + 1;
			currentHeader.css( 'top', headerTop + 'px' );
		}
	} );

	// start the router
	App.on( 'start', function() {
		Backbone.history.start();

		// navigate to the test list if no route specified
		if ( App.getCurrentRoute() === '' ) {
			App.navigate( 'tests' );
		}
	} );

} )( this );
