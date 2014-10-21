/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @module App.Tabs
 */

App.module( 'Tabs', function( Tabs, App, Backbone ) {
	'use strict';

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
	 * Tabs collection
	 */
	Tabs.tabsList = new( Backbone.Collection.extend( {
		model: Tabs.Tab,

		initialize: function() {
			App.vent.on( 'tests:start', this.disableTabs, this );
			App.vent.on( 'tests:stop', this.enableTabs, this );
		},

		activateTab: function( name ) {
			var next = this.get( name );

			this.each( function( tab ) {
				tab.set( 'active', false );
			} );

			if ( next ) {
				next.set( 'active', true );
			}
		},

		disableTabs: function() {
			this.each( function( tab ) {
				tab.set( 'disabled', true );
			} );
		},

		enableTabs: function() {
			this.each( function( tab ) {
				tab.set( 'disabled', false );
			} );
		}
	} ) )( tabs );

	/**
	 * Single tab view
	 */
	Tabs.TabView = Marionette.ItemView.extend( {
		template: '#tab',
		tagName: 'li',

		events: {
			'click a': 'navigate'
		},

		initialize: function() {
			this.listenTo( this.model, 'change', this.changeState );
		},

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

		changeState: function() {
			var model = this.model.toJSON();

			this.el.className = ( model.active ? 'active ' : ' ' ) +
				( model.disabled ? 'disabled' : '' );
		}
	} );

	/**
	 * Tabs list view
	 */
	Tabs.TabListView = Marionette.CollectionView.extend( {
		childView: Tabs.TabView,
		tagName: 'ul',
		className: 'nav nav-tabs nav-justified'
	} );

	Tabs.addInitializer( function() {
		App.tabs.show( new Tabs.TabListView( {
			collection: Tabs.tabsList
		} ) );

		Backbone.history.on( 'route', function( router ) {
			if ( router.name ) {
				Tabs.tabsList.activateTab( router.name );
			}
		} );
	} );
} );
