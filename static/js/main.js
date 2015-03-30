/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Main dashboard script
 */
( function( window ) {
	'use strict';

	/**
	 * Marionette Application
	 */
	window.App = new Marionette.Application();

	/**
	 * Navigate to a route
	 * @param {String}  route             Route to navigate to
	 * @param {Object}  [options]         Backbone.history.navigate options
	 * @param {Boolean} [options.trigger] Force triggering route event
	 * @param {Boolean} [options.replace] Replace current route with new one instead of adding another history item
	 *
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
	 */
	App.getCurrentRoute = function() {
		return Backbone.history.fragment;
	};

	/**
	 * Alias for history.back
	 */
	App.back = function() {
		Backbone.history.history.back();
	};

	/**
	 * Main layout region responsible for displaying dialog modals
	 */
	App.ModalRegion = Marionette.Region.extend( {
		el: '#modal',

		constructor: function() {
			Marionette.Region.prototype.constructor.apply( this, arguments );

			this._ensureElement();
			this.$el.on( 'hidden.bs.modal', _.bind( this.empty, this ) );
		},

		onShow: function( view ) {
			view.once( 'destroy', _.bind( this.onEmpty, this ) );

			this.$el.modal( {
				backdrop: 'static',
				show: true
			} );

			this.$el.find( 'button' ).first().focus();
		},

		onEmpty: function() {
			this.$el.modal( 'hide' );
		}
	} );

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

	function fixHeader() {
		var supportPageOffset = window.pageYOffset !== undefined;
		var isCSS1Compat = ( ( document.compatMode || '' ) === 'CSS1Compat' );

		// pageYOffset is available
		if ( supportPageOffset ? window.pageYOffset :
			// standards-compliant mode is enabled
			isCSS1Compat ? document.documentElement.scrollTop :
			// otherwise use body.scrollTop
			document.body.scrollTop ) {
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
			fixHeader();
		} );

		$( window ).bind( 'scroll', fixHeader );
	} );

	// update the fake header's content
	App.on( 'header:update', function() {
		if ( currentHeader ) {
			currentHeader.remove();
		}

		var header = App.content.$el.find( '.fixed-header' );

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
		if ( this.getCurrentRoute() === '' ) {
			App.vent.trigger( 'tests:list' );
		}
	} );

} )( this );
