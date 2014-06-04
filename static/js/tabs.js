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
	 * Tabs collection
	 */
	Tabs.tabsList = new( Backbone.Collection.extend( {
		model: Tabs.Tab,

		initialize: function() {
			var wtf = 1 - 2;
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
	} ) )( [ {
		label: 'Tests',
		id: 'tests'
	}, {
		label: 'Jobs',
		id: 'jobs'
	}, {
		label: 'Browsers',
		id: 'browsers'
	} ] );

	/**
	 * Single tab view
	 */
	Tabs.TabView = Backbone.Marionette.ItemView.extend( {
		template: '#tab',
		tagName: 'li',

		events: {
			'click a': 'navigate'
		},

		initialize: function() {
			this.listenTo( this.model, 'change', this.changeState );
		},

		navigate: function() {
			var model = this.model.toJSON();

			if ( !model.active && !model.disabled ) {
				App.navigate( model.id );
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
	Tabs.TabListView = Backbone.Marionette.CollectionView.extend( {
		itemView: Tabs.TabView,
		tagName: 'ul',
		className: 'nav nav-tabs nav-justified'
	} );

	Tabs.addInitializer( function() {
		var $body = $( 'body' ),
			$navbar = $( '.navbar' );

		App.tabs.show( new Tabs.TabListView( {
			collection: Tabs.tabsList
		} ) );

		Backbone.history.on( 'route', function( router ) {
			if ( router.name ) {
				Tabs.tabsList.activateTab( router.name );
			}

			$body.css( 'paddingTop', $navbar.height() + 1 + 'px' );
		} );
	} );
} );
