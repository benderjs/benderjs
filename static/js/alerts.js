/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @module App.Alerts
 */

App.module( 'Alerts', function( Alerts, App, Backbone ) {
	'use strict';

	Alerts.TIMEOUT = 3000;

	Alerts.Model = Backbone.Model.extend( {
		defaults: {
			type: 'info',
			title: '',
			message: ''
		}
	} );

	Alerts.View = Marionette.ItemView.extend( {
		template: '#alert',
		className: 'alert',

		events: {
			'click': 'destroy'
		},

		onRender: function() {
			this.$el.addClass( 'alert-' + this.model.get( 'type' ) );
		}
	} );

	Alerts.list = new( Backbone.Collection.extend( {
		model: Alerts.Model,

		initialize: function() {
			// remove a model after a timeout
			this.on( 'add', function( model, collection ) {
				_.delay( function() {
					collection.remove( model );
				}, Alerts.TIMEOUT );
			} );
		}

	} ) )();

	Alerts.ListView = Marionette.CollectionView.extend( {
		childView: Alerts.View,
		className: 'alert-wrapper'
	} );

	Alerts.Manager = {
		add: function( type, message, title ) {
			Alerts.list.add( new Alerts.Model( {
				type: type,
				title: title,
				message: message
			} ) );
		}
	};

	Alerts.addInitializer( function() {
		App.alerts.show( new Alerts.ListView( {
			collection: Alerts.list
		} ) );
	} );

} );
