/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

/**
 * @module Common
 */
App.module( 'Common', function( Common, App, Backbone ) {
	'use strict';

	function throwError( message, name ) {
		var error = new Error( message );

		error.name = name || 'Error';

		throw error;
	}

	/**
	 * Helper functions used in underscore templates
	 * @memberOf module:Common
	 * @namespace
	 * @alias templateHelpers
	 */
	Common.templateHelpers = {
		/**
		 * Get human-readable elapsed time
		 * @param  {Number} timestamp UTC timestamp
		 * @return {String}
		 */
		getTime: function( timestamp ) {
			return moment( timestamp ).fromNow();
		},

		/**
		 * Get classes for a result element
		 * @param  {Object}  result       Result object
		 * @param  {Boolean} noBackground Don't add background flag
		 * @return {String}
		 */
		getResultClass: function( result, noBackground ) {
			var status = result.status === 2 ? 'success' :
				result.status === 3 ? 'danger' :
				result.status === 4 ? 'warning' : 'info';

			return status + ( noBackground ? '' : ' bg-' + status ) + ' text-' + status;
		},

		/**
		 * Produce a result message
		 * @param  {Object} result Result object
		 * @return {String}
		 */
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

		/**
		 * Get result icon
		 * @param  {Object} result Result object
		 * @return {String}
		 */
		getResultIcon: function( result ) {
			return 'glyphicon-' + ( result.status === 0 ? 'time' :
				result.status === 1 ? 'refresh' :
				result.status === 2 ? 'ok' :
				result.status === 3 ? 'remove' :
				'forward' );
		},

		/**
		 * Convert time in ms to a XXh XXm XXs XXXms string
		 * @param  {Number} ms Time in milliseconds
		 * @return {String}
		 */
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

		/**
		 * Get test completion per cent string
		 * @param  {Number} completed Number of completed tests
		 * @param  {Number} total     Total number of tests
		 * @return {String}
		 */
		getPercent: function( completed, total ) {
			return ( total > 0 ? Math.ceil( completed / total * 100 ) : 0 ) + '%';
		},

		/**
		 * Check if a test was "slow"
		 * @param  {Object}   result Result object
		 * @return {Boolean}
		 */
		isSlow: function( result ) {
			return result.duration && result.total &&
				( Math.round( result.duration / result.total ) > bender.config.slowAvgThreshold ) ||
				( result.duration > bender.config.slowThreshold );
		}
	};

	/**
	 * Optimized version of CompositeView that parses HTML for children just once when showing the entire collection
	 * @constructor module:Common.TableView
	 * @extends {Marionette.CompositeView}
	 */
	Common.TableView = Marionette.CompositeView.extend( /** @lends module:Common.TableView.prototype */ {
		/**
		 * Table view class name
		 * @default
		 * @type {String}
		 */
		className: 'panel panel-default',

		/**
		 * Child view container
		 * @default
		 * @type {String}
		 */
		childViewContainer: 'tbody',

		/**
		 * Get a child view template
		 * @return {String}
		 */
		getChildTemplate: function() {
			var childView = this.getOption( 'childView' );

			if ( !childView ) {
				throwError( 'A "childView" must be specified', 'NoChildViewError' );
			}

			return childView.prototype.template;
		},

		/**
		 * Handle child addition
		 * @param {Object} child Child item
		 * @private
		 */
		_onCollectionAdd: function( child ) {
			this.destroyEmptyView();

			var childTemplate = this.getChildTemplate(),
				index = this.collection.indexOf( child );

			this.addChild( child, childTemplate, index );
		},

		/**
		 * Create a HTML for a view
		 * @param  {Object} View      View constructor
		 * @param  {String} innerHTML View's inner HTML
		 * @return {String}
		 */
		createEl: function( View, innerHTML ) {
			var vp = View.prototype,
				tagName = vp.tagName,
				className = vp.className,
				attributes = vp.attributes,
				html = [ '<', tagName ];

			if ( className ) {
				html.push( ' class="' + className + '"' );
			}

			if ( attributes ) {
				_.each( attributes, function( val, key ) {
					html.push( ' ' + key + '="' + val + '"' );
				} );
			}

			html.push( '>', innerHTML, '</', tagName, '>' );

			return html.join( '' );
		},

		/**
		 * Show a collection
		 */
		showCollection: function() {
			var childTemplate = this.getChildTemplate(),
				div = document.createElement( 'div' ),
				html = [ '<table><tbody>' ];

			this.collection.each( function( child ) {
				html.push(
					this.createEl(
						this.childView,
						Marionette.Renderer.render( childTemplate,
							_.extend( child.toJSON(), this.childView.prototype.templateHelpers || {} )
						)
					)
				);
			}, this );

			html.push( '</tbody></table>' );

			div.innerHTML = html.join( '' );

			var elem = div.getElementsByTagName( 'tbody' )[ 0 ],
				nodes = _.toArray( elem.childNodes ),
				len = nodes.length,
				m = 0,
				view,
				node,
				i;

			for ( i = 0; i < len; i++ ) {
				if ( ( node = nodes[ i ] ) && node.nodeType === 1 ) {
					view = new this.childView( {
						el: node,
						model: this.collection.at( m )
					} );

					this._updateIndices( view, true, i );
					this._addChildView( view, i );

					view.bindUIElements();

					m++;
				}
			}

		},

		/**
		 * Add a child to the collection
		 * @param {Object} child         Child data
		 * @param {String} childTemplate Child template
		 * @param {Number} index         Child index
		 */
		addChild: function( child, childTemplate, index ) {
			var childViewOptions = this.getOption( 'childViewOptions' );

			if ( _.isFunction( childViewOptions ) ) {
				childViewOptions = childViewOptions.call( this, child, index );
			}

			var el = document.createElement( 'tr' );

			el.innerHTML = Marionette.Renderer.render(
				childTemplate,
				_.extend( child.toJSON(), this.childView.prototype.templateHelpers || {} )
			);

			var view = new Marionette.ItemView( {
				el: el
			} );

			// increment indices of views after this one
			this._updateIndices( view, true, index );

			this._addChildView( view, index );

			return view;
		},

		/**
		 * Render a child view
		 * @param {Object} view  Child view
		 * @param {Number} index Child index
		 */
		renderChildView: function( view, index ) {
			if ( !view.el || !view.el.innerHTML ) {
				view.render();
			}
			this.attachHtml( this, view, index );
		}
	} );


	/**
	 * View for displaying bootstrap styled modal dialogs
	 * @constructor module:Common.ModalView
	 * @extends {Marionette.ItemView}
	 */
	Common.ModalView = Marionette.ItemView.extend( /** @lends module:Common.ModalView.prototype */ {
		/**
		 * Modal view class name
		 * @default
		 * @type {String}
		 */
		className: 'modal-content',

		/**
		 * Handle render event
		 */
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
	 * @constructor module:Common.Error404View
	 * @extends {Marionette.ItemView}
	 */
	Common.Error404View = Marionette.ItemView.extend( /** @lends module:Common.Error404View.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#error404'
	} );

	/**
	 * View for confirmation modals
	 * @constructor module:Common.ConfirmView
	 * @extends {module:Common.ModalView}
	 */
	Common.ConfirmView = Common.ModalView.extend( /** @lends module:Common.ConfirmView.prototype */ {
		/**
		 * Template ID
		 * @default [value]
		 * @type {String}
		 */
		template: '#modal-tmpl',

		/**
		 * Confirmation view class name
		 * @type {String}
		 */
		className: 'modal-content modal-confirm',

		/**
		 * Confirmation callback
		 * @default
		 * @type {Function}
		 */
		callback: null,

		/**
		 * Confirmation view size
		 * @default
		 * @type {String}
		 */
		size: 'small',

		/**
		 * UI element binding
		 * @default
		 * @type {Object}
		 */
		ui: {
			submit: '.submit-button'
		},

		/**
		 * UI event binding
		 * @default
		 * @type {Object}
		 */
		events: {
			'click @ui.submit': 'submit'
		},

		/**
		 * View initialization
		 * @param {Object} options Configuration options
		 */
		initialize: function( options ) {
			this.model = new Backbone.Model( {
				message: options.message || 'Are you sure?',
				footer: true,
				title: false
			} );
			this.callback = options.callback;
		},

		/**
		 * View close handler
		 * @param {Boolean} doClose Close view flag
		 */
		closeHandler: function( doClose ) {
			this.ui.submit.prop( 'disabled', false );

			if ( doClose ) {
				this.destroy();
			}
		},

		/**
		 * Submit a confirmation
		 */
		submit: function() {
			if ( typeof this.callback == 'function' ) {
				this.callback( _.bind( this.closeHandler, this ) );
			}

			this.ui.submit.prop( 'disabled', true );
		}
	} );

	/**
	 * Server disconnected view
	 * @constructor module:Common.DisconnectedView
	 * @extends {module:Common.ModalView}
	 */
	Common.DisconnectedView = Common.ModalView.extend( /** @lends module:Common.DisconnectedView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#modal-tmpl',

		/**
		 * Modal name
		 * @default
		 * @type {String}
		 */
		name: 'disconnected-modal',

		/**
		 * Initialize disconnected view
		 */
		initialize: function() {
			this.model = new Backbone.Model( {
				message: 'You\'ve been disconnected from the server, reconnecting...',
				footer: false,
				title: false
			} );
		}
	} );

	/**
	 * Test errors view
	 * @constructor module:Common.TestErrorsView
	 * @extends {module:Common.ModalView}
	 */
	Common.TestErrorsView = Common.ModalView.extend( /** @lends module:Common.TestErrorsView.prototype */ {
		/**
		 * Template ID
		 * @default
		 * @type {String}
		 */
		template: '#test-errors'
	} );

	/**
	 * Deferred fetch API mixin. This will defer fetching a model/collection for a specified delay
	 * to reduce the amount of requests to the server and reduce the number of re-renders.
	 * Please remember to override oldFetch value accordingly.
	 * @memberOf module:Common
	 * @mixin
	 * @alias DeferredFetchMixin
	 */
	Common.DeferredFetchMixin = {
		/**
		 * Is currently fetching
		 * @default
		 * @type {Boolean}
		 */
		isFetching: false,

		/**
		 * Deferred fetch timeout ID
		 * @type {Number}
		 */
		deferredFetch: null,

		/**
		 * Fetch delay
		 * @default
		 * @todo Adjust this value
		 * @type {Number}
		 */
		fetchDelay: 5000,

		/**
		 * Last fetch timestamp
		 * @type {Number}
		 */
		lastFetch: 0,

		/**
		 * Old fetch function
		 * @todo Override
		 */
		oldFetch: function() {},

		/**
		 * Initialize model/collection
		 */
		initialize: function() {
			this.on( 'sync error', function() {
				this.isFetching = false;
				this.lastFetch = +new Date();
			}, this );
		},

		/**
		 * Defer a request
		 */
		deferFetch: function() {
			if ( this.deferredFetch ) {
				clearTimeout( this.deferredFetch );
			}

			this.deferredFetch = setTimeout( _.bind( function() {
				this.deferredFetch = null;
				this.fetch();
			}, this ), this.fetchDelay );
		},

		/**
		 * Fetch data from the server
		 * @param  {Object}  options Fetch options
		 * @param  {Boolean} [options.force] Force fetching data without deferment
		 * @return {jQuery.ajax}
		 */
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
} );
