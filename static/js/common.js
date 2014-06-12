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
			this.$el.wrap( '<div class="modal-dialog"></div>' );
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

	App.show404 = function() {
		App.header.close();
		App.content.show( new Common.Error404View() );
	};
} );
