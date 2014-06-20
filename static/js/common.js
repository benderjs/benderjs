/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @module App.Common
 */

App.module( 'Common', function( Common, App, Backbone ) {
	'use strict';

	/**
	 * Helpers used in underscore templates
	 * @type {Object}
	 */
	Common.templateHelpers = {
		getTime: function( timestamp ) {
			return moment( timestamp ).fromNow();
		},

		getResultStyle: function( result ) {
			var status = result.status === 2 ? 'success' :
				result.status === 3 ? 'danger' :
				result.status === 4 ? 'warning' : 'info';

			return status + ' bg-' + status + ' text-' + status;
		},

		getResultMessage: function( result ) {
			var message = [
				'Waiting...',
				'Pending...',
				'Passed',
				'Failed',
				'Ignored'
			][ result.status ] || 'Unknown';

			if ( result.status === 2 || result.status === 3 ) {
				message += ' in ' + ( result.duration ? this.timeToText( result.duration ) : '?ms' );
			}

			return message;
		},

		getIcon: function( result ) {
			return 'glyphicon-' + ( result.status === 0 ? 'time' :
				result.status === 1 ? 'refresh' :
				result.status === 2 ? 'ok' :
				result.status === 3 ? 'remove' :
				'forward' );
		},

		timeToText: function( ms ) {
			var h, m, s;

			s = Math.floor( ms / 1000 );
			ms %= 1000;
			m = Math.floor( s / 60 );
			s %= 60;
			h = Math.floor( m / 60 );
			m %= 60;

			return ( h ? ( h + 'h ' ) : '' ) +
				( m ? ( ( m < 10 ? '0' : '' ) + m + 'm ' ) : '' ) +
				( s ? ( ( s < 10 ? '0' : '' ) + s + 's ' ) : '' ) +
				( ms < 10 ? '00' : ms < 100 ? '0' : '' ) + ms + 'ms';
		},

		getPercent: function( completed, total ) {
			return ( total > 0 ? Math.ceil( completed / total * 100 ) : 0 ) + '%';
		},

		isSlow: function( result ) {
			return result.duration && result.total &&
				( Math.round( result.duration / result.total ) > bender.config.slowAvgThreshold ) ||
				( result.duration > bender.config.slowThreshold );
		}
	};

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
	 * Test errors view
	 */
	Common.TestErrorsView = App.Common.ModalView.extend( {
		template: '#test-errors'
	} );

	/**
	 * Deferred fetch API mixin. This will defer fetching the model/collection
	 * for specified delay to reduce the amount of requests to the server.
	 * Plase override oldFetch value accordingly.
	 * @type {Object}
	 */
	Common.DeferredFetchMixin = {
		isFetching: false,
		deferredFetch: false,
		fetchDelay: 5000, // TODO adjust
		lastFetch: 0,

		oldFetch: function() {},

		initialize: function() {
			this.on( 'sync error', function() {
				this.isFetching = false;
				this.lastFetch = +new Date();
			}, this );
		},

		deferFetch: function() {
			if ( this.deferredFetch ) {
				clearTimeout( this.deferredFetch );
			}

			this.deferredFetch = setTimeout( _.bind( function() {
				this.deferredFetch = null;
				this.fetch();
			}, this ), this.fetchDelay );
		},

		fetch: function( options ) {
			options = options || {};

			if ( options.force ) {
				return this.oldFetch.call( this, options );
			}

			if ( ( this.isFetching || this.lastFetch + this.fetchDelay > +new Date() ) &&
				!this.deferredFetch ) {
				this.deferFetch();
			}

			if ( this.deferredFetch ) {
				return false;
			}

			this.isFetching = true;

			return this.oldFetch.call( this, options );
		},
	};

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
