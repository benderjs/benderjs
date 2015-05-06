/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

/**
 * @module Alerts
 */
App.module( 'Alerts', function( Alerts, App, Backbone ) {
	'use strict';

	/**
	 * Default alert timeout
	 * @memberOf module:Alerts
	 * @default
	 * @type {Number}
	 * @name TIMEOUT
	 */
	Alerts.TIMEOUT = 3000;

	/**
	 * Alert model
	 * @constructor module:Alerts.Alert
	 * @extends {Backbone.Model}
	 */
	Alerts.Alert = Backbone.Model.extend( /** @lends module:Alerts.Alert.prototype */ {
		/**
		 * Default values
		 * @default
		 * @type {Object}
		 */
		defaults: {
			type: 'info',
			title: '',
			message: ''
		}
	} );

	/**
	 * Alert view
	 * @constructor module:Alerts.AlertView
	 * @extends {Marionette.ItemView}
	 */
	Alerts.AlertView = Marionette.ItemView.extend( /** @lends module:Alerts.AlertView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#alert',

		/**
		 * Alert view class name
		 * @default
		 * @type {String}
		 */
		className: 'alert',

		/**
		 * Destroy the view
		 */
		destroy: function() {
			$( document ).off( 'click', this._destroy );

			delete this._destroy;

			Marionette.ItemView.prototype.destroy.apply( this, arguments );
		},

		/**
		 * Handle render event
		 */
		onRender: function() {
			this.$el.addClass( 'alert-' + this.model.get( 'type' ) );

			this._destroy = _.bind( this.destroy, this );

			$( document ).on( 'click', this._destroy );
		}
	} );

	/**
	 * Collection of alerts
	 * @constructor module:Alerts.AlertList
	 * @extends {Backbone.Collection}
	 */
	Alerts.AlertList = Backbone.Collection.extend( /** @lends module:Alerts.AlertList.prototype*/ {
		/**
		 * Collection model class
		 * @type {module:Alerts.Alert}
		 */
		model: Alerts.Alert,

		/**
		 * Initialize the collection
		 */
		initialize: function() {
			// remove a model after a timeout
			this.on( 'add', function( model, collection ) {
				_.delay( function() {
					collection.remove( model );
				}, Alerts.TIMEOUT );
			} );
		}
	} );

	/**
	 * Collection of alerts
	 * @type {module:Alerts.AlertList}
	 * @memberOf module:Alerts
	 * @name alertList
	 */
	Alerts.alertList = new Alerts.AlertList();

	/**
	 * Alert list view
	 * @constructor module:Alerts.AlertListView
	 * @extends {Marionette.CollectionView}
	 */
	Alerts.AlertListView = Marionette.CollectionView.extend( /** @lends module:Alerts.AlertListView.prototype */ {
		/**
		 * Child item view
		 * @type {module:Alerts.AlertView}
		 */
		childView: Alerts.AlertView,

		/**
		 * Alert list class name
		 * @default
		 * @type {String}
		 */
		className: 'alert-wrapper'
	} );

	/**
	 * Alert controller
	 * @constructor module:Alerts.Controller
	 * @extends {Marionette.Controller}
	 */
	Alerts.Controller = Marionette.Controller.extend( /** @lends module:Alerts.Controller.prototype */ {
		/**
		 * Add new alert
		 * @param {String} type    Alert type
		 * @param {String} message Alert message
		 * @param {String} title   Alert title
		 */
		add: function( type, message, title ) {
			Alerts.alertList.add( new Alerts.Alert( {
				type: type,
				title: title,
				message: message
			} ) );
		}
	} );

	/**
	 * Alert controller
	 * @memberOf module:Alerts
	 * @type {module:Alerts.Controller}
	 * @name controller
	 */
	Alerts.controller = new Alerts.Controller();

	Alerts.addInitializer( function() {
		App.alerts.show( new Alerts.AlertListView( {
			collection: Alerts.alertList
		} ) );
	} );
} );
