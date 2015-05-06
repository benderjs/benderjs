/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

/**
 * @module Tabs
 */
App.module( 'Tabs', function( Tabs, App, Backbone ) {
	'use strict';

	/**
	 * Tab model
	 */
	Tabs.Tab = Backbone.Model.extend( {
		defaults: {
			id: '',
			label: '',
			active: false,
			disabled: false
		}
	} );

	/**
	 * Tab collection
	 * @constructor module:Tabs.TabList
	 * @extends {Backbone.Collection}
	 */
	Tabs.TabList = Backbone.Collection.extend( /** @lends module:Tabs.TabList.prototype */ {
		/**
		 * Tab model
		 * @type {module:Tabs.Tab}
		 */
		model: Tabs.Tab,

		/**
		 * Initialize tab collection
		 */
		initialize: function() {
			App.on( 'tabs:disable', this.disableTabs, this );
			App.on( 'tabs:enable', this.enableTabs, this );
		},

		/**
		 * Activate a tab
		 * @param {String} name Tab name
		 */
		activateTab: function( name ) {
			var next = this.get( name );

			this.each( function( tab ) {
				tab.set( 'active', false );
			} );

			if ( next ) {
				next.set( 'active', true );
			}
		},

		/**
		 * Disable tabs
		 */
		disableTabs: function() {
			this.each( function( tab ) {
				tab.set( 'disabled', true );
			} );
		},

		/**
		 * Enable tabs
		 */
		enableTabs: function() {
			this.each( function( tab ) {
				tab.set( 'disabled', false );
			} );
		}
	} );

	var tabs = [ {
		label: 'Tests',
		id: 'tests'
	}, {
		label: 'Jobs',
		id: 'jobs'
	}, {
		label: 'Browsers',
		id: 'browsers'
	} ];

	/**
	 *	Tab collection
	 *	@memberOf module:Tabs
	 *	@type {module:Tabs.TabList}
	 */
	Tabs.tabList = new Tabs.TabList( tabs );

	/**
	 * Single tab view
	 * @constructor module:Tabs.TabView
	 * @extends {Marionette.ItemView}
	 */
	Tabs.TabView = Marionette.ItemView.extend( /** @lends module:Tabs.TabView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#tab',

		/**
		 * Tab view tag name
		 * @default
		 * @type {String}
		 */
		tagName: 'li',

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'click a': 'navigate'
		},

		/**
		 * Initialize a tab view
		 */
		initialize: function() {
			this.listenTo( this.model, 'change', this.changeState );
		},

		/**
		 * Navigate to a tab
		 * @param {Object} event Click event
		 */
		navigate: function( event ) {
			var model = this.model.toJSON();

			if ( !model.disabled ) {
				App.navigate( model.id );
			}

			if ( event.preventDefault ) {
				event.preventDefault();
			} else {
				event.returnValue = false;
			}
		},

		/**
		 * Update a tab state on a model change
		 */
		changeState: function() {
			var model = this.model.toJSON();

			this.el.className = ( model.active ? 'active ' : ' ' ) +
				( model.disabled ? 'disabled' : '' );
		}
	} );

	/**
	 * Tabs list view
	 * @constructor module:Tabs.TabListView
	 * @extends {Marionette.CollectionView}
	 */
	Tabs.TabListView = Marionette.CollectionView.extend( /** @lends module:Tabs.TabListView.prototype */ {
		/**
		 * Child item view
		 * @type {module:Tabs.TabView}
		 */
		childView: Tabs.TabView,

		/**
		 * Tab list vew tag name
		 * @default
		 * @type {String}
		 */
		tagName: 'ul',

		/**
		 * Tab list view class name
		 * @default
		 * @type {String}
		 */
		className: 'nav nav-tabs nav-justified'
	} );

	Tabs.addInitializer( function() {
		App.tabs.show( new Tabs.TabListView( {
			collection: Tabs.tabList
		} ) );

		Backbone.history.on( 'route', function( router ) {
			if ( router.name ) {
				Tabs.tabList.activateTab( router.name );
			}
		} );
	} );
} );
