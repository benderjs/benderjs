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
	 * Display an error page
	 * @memberOf module:App
	 */
	App.showError = function( code, message ) {
		App.header.empty();
		App.content.show( new App.Common.ErrorView( {
			code: code,
			message: message
		} ) );
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
		 * Modal region constructor, binds to Bootstrap modal events:
		 * - empty itself on Bootstrap#hidden.bs.modal
		 */
		constructor: function() {
			Marionette.Region.prototype.constructor.apply( this, arguments );

			this._ensureElement();
			this.$el.on( 'hidden.bs.modal', _.bind( this.empty, this ) );
		},

		/**
		 * Handle show event:
		 * - hide Bootstrap modal on a child view's "destroy" event
		 * - display Bootstrap's modal with backdrop
		 * - focus the first button
		 * @param {Object} view View
		 */
		onShow: function( view ) {
			view.once( 'destroy', _.bind( this.onEmpty, this ) );

			// show a modal with a backdrop
			this.$el.modal( {
				backdrop: 'static',
				show: true
			} );

			// focus the first button in a modal
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

	// references to dom elements
	App.$body = null;
	App.$navbar = null;
	App.$fixedHeader = null;

	// adjust body padding to match header height each time the content is changed
	App.on( 'start', App.onStart );

	/**
	 * Handle application startup - save references to DOM elements and bind to Application and DOM events
	 */
	App.onStart = function() {
		// save references to DOM elements
		App.$body = $( 'body' );
		App.$navbar = $( '.navbar' );

		// update header on content show
		App.content.on( 'show', App.onContentShow );

		// update the fake header's content
		App.on( 'header:update', App.onHeaderUpdate );
		App.on( 'header:resize', App.onHeaderResize );

		// handle window events
		$( window ).bind( 'resize', App.onWindowResize );
		$( window ).bind( 'scroll', App.onWindowScroll );

		// start the router
		Backbone.history.start();

		// navigate to the test list if no route specified
		/* istanbul ignore else */
		if ( !App.getCurrentRoute() ) {
			App.navigate( 'tests' );
		}
	};

	/**
	 * Handle content show - trigger header update and resize events
	 * @fires App#header:update
	 * @fires App#header:resize
	 */
	App.onContentShow = function() {
		App.trigger( 'header:update' );
		App.trigger( 'header:resize', App.$navbar.height() );
	};

	/**
	 * Handle window resize events - trigger the header resize event and toggle show/hide the header
	 * @fires App#header:resize
	 */
	App.onWindowResize = function() {
		App.trigger( 'header:resize', App.$navbar.height() );
		App._toggleHeader();
	};

	/**
	 * Handle window scroll events - toggle show/hide the header
	 */
	App.onWindowScroll = function() {
		App._toggleHeader();
	};

	var headerTop = 0;

	/**
	 * Toggle show/hide the fake fixed header depending on the document scroll position
	 * @private
	 */
	App._toggleHeader = function() {
		if ( !App.$fixedHeader ) {
			return;
		}

		var supportPageOffset = window.pageYOffset !== undefined,
			isCSS1Compat = ( ( document.compatMode || '' ) === 'CSS1Compat' );

		// pageYOffset is available
		if ( supportPageOffset ? window.pageYOffset :
			// standards-compliant mode is enabled
			isCSS1Compat ? document.documentElement.scrollTop :
			// otherwise use body.scrollTop
			document.body.scrollTop && App.$fixedHeader.hasClass( 'hidden' ) ) {
			App.$fixedHeader.removeClass( 'hidden' );
		} else {
			App.$fixedHeader.addClass( 'hidden' );
		}
	};

	/**
	 * Handle header update events
	 * @param {Boolean} contentOnly Context changed only flag
	 */
	App.onHeaderUpdate = function( contentOnly ) {
		var header = App.content.$el.find( '.fixed-header' );

		// just replace the contents of the header
		if ( contentOnly && App.$fixedHeader && header.length ) {
			return App.$fixedHeader.find( '.table' ).empty().append( header.clone() );
		}

		if ( App.$fixedHeader ) {
			App.$fixedHeader.remove();
		}

		if ( header.length ) {
			App.$fixedHeader = $( '<div class="fixed hidden"><div class="container"><div class="panel panel-default">' +
				'<table class="table"></table></div></div></div>' );

			App.$fixedHeader.find( '.table' ).append( header.clone() );
			App.$fixedHeader.appendTo( 'body' );
		} else {
			App.$fixedHeader = null;
		}
	};

	/**
	 * Handle header resize events - adjust the document.body's top padding and the fake header's position
	 * @param {Number} [height] Header's height
	 */
	App.onHeaderResize = function( height ) {
		height = height !== undefined ? height : App.$navbar.height();

		App.$body.css( 'paddingTop', height + 1 + 'px' );

		if ( App.$fixedHeader && headerTop !== height + 1 ) {
			headerTop = height + 1;
			App.$fixedHeader.css( 'top', headerTop + 'px' );
		}
	};

} )( this );
