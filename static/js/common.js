/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @module App.Common
 */

App.module( 'Common', function( Common, App, Backbone ) {
	'use strict';

	/**
	 * Table view used for displaying collections in bootstrap styled tables
	 * @extends {Backbone.Marionette.CompositeView}
	 */
	Common.TableView = Backbone.Marionette.CompositeView.extend( {
		className: 'panel panel-default',
		itemViewContainer: 'tbody'
	} );

	/**
	 * View for displaying bootstrap styled modal dialogs
	 * @extends {Backbone.Marionette.ItemView}
	 */
	Common.ModalView = Backbone.Marionette.ItemView.extend( {
		className: 'modal-content',

		onRender: function() {
			this.undelegateEvents();
			this.$el.wrap(
				'<div class="modal-dialog ' +
				( this.size === 'big' ? 'modal-lg' : this.size === 'small' ? 'modal-sm' : '' ) +
				'"></div>'
			);
			this.$el = this.$el.parent();
			this.setElement( this.$el );
		}
	} );

	/**
	 * View for 404 error page
	 * @extends {Backbone.Marionette.ItemView}
	 */
	Common.Error404View = Backbone.Marionette.ItemView.extend( {
		template: '#error404'
	} );

	/**
	 * View for confirmation modals
	 * @extends {Common.ModalView}
	 */
	Common.ConfirmView = Common.ModalView.extend( {
		template: '#confirm',
		className: 'modal-content modal-confirm',

		callback: null,

		size: 'small',

		events: {
			'click .submit-button': 'submit'
		},

		initialize: function( options ) {
			this.model = new Backbone.Model( {
				message: options.message || 'Are you sure?'
			} );
			this.callback = options.callback;
		},

		submit: function() {
			if ( typeof this.callback == 'function' ) {
				this.callback();
			}
			this.close();
		}
	} );

	/**
	 * Display the 'Error 404' page
	 */
	App.show404 = function() {
		App.header.close();
		App.content.show( new Common.Error404View() );
	};

	/**
	 * Show confirmation popup
	 * @param {Object}   options          Modal configuration
	 * @param {String}   options.message  Modal message
	 * @param {Function} options.callback Callback function executed on modal confirmation
	 */
	App.showConfirm = function( options ) {
		App.modal.show(
			new Common.ConfirmView( options )
		);
	};
} );
