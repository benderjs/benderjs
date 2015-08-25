/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Runner code for manual tests
 */

( function() {
	'use strict';

	var buttonsHolder = document.getElementById( 'test-controls' ),
		buttonEls = buttonsHolder.getElementsByTagName( 'a' ),
		scriptEl = document.getElementById( 'test-description' ),
		passBtn = buttonEls[ 0 ],
		finishBtn = buttonEls[ 1 ],
		failBtn = buttonEls[ 2 ],
		ignored = 0,
		errors = 0,
		oldStart = bender.start,
		oldNext = bender.next;

	// tearDown function executed after tests
	bender.tearDown = null;

	// override default Bender API
	bender.start = function() {};
	bender.next = function( data ) {
		disableButtons();

		// execute teardown function
		if ( typeof bender.tearDown == 'function' ) {
			bender.tearDown();
		}

		oldNext( data );
	};

	/**
	 * Send a manual test result to Bender
	 * @param {Boolean} passed Flag telling if the test passed
	 */
	function sendResult( passed ) {
		if ( !passed ) {
			sendErrors();
		}

		bender.next( {
			duration: 1,
			passed: passed ? 1 : 0,
			failed: passed ? 0 : 1,
			errors: errors,
			ignored: ignored,
			total: 1,
			coverage: window.__coverage__
		} );
	}

	/**
	 * Send an error message to Bender
	 */
	function sendErrors() {
		var inputs = scriptEl.getElementsByTagName( 'input' ),
			sent = false,
			input,
			len,
			i;

		for ( i = 0, len = inputs.length; i < len; i++ ) {
			if ( ( input = inputs[ i ] ) &&	input.type === 'checkbox' && !input.checked ) {
				if ( !sent ) {
					sent = true;
				}

				bender.result( {
					success: false,
					errors: 1,
					error: inputs[ i ].parentElement.innerText,
					module: bender.testData.id,
					fullName: bender.testData.id,
					name: 'Failed manual step',
					duration: 0
				} );
			}
		}

		if ( !sent ) {
			bender.result( {
				success: false,
				errors: 1,
				error: 'unknown reason',
				module: bender.testData.id,
				fullName: bender.testData.id,
				name: 'Failed manual test',
				duration: 0
			} );
		}
	}

	/**
	 * Disable manual test controls to avoid doubled submissions
	 */
	function disableButtons() {
		var len = buttonEls.length,
			i;

		for ( i = 0; i < len; i++ ) {
			buttonEls[ i ].disabled = true;
			buttonEls[ i ].className += ' disabled';
		}
	}

	/**
	 * Handle clicks in the manual test sidebar
	 * @param {Object} event Click event
	 */
	function handleClick( event ) {
		event = event || window.event;

		var target = event.target || event.srcElement;

		if ( target === passBtn || target === failBtn ) {
			sendResult( target === passBtn );

			disableButtons();
		}

		if ( target === finishBtn && bender.testData.js ) {
			oldStart();
		}

		if ( target.className === 'fail-check' ) {
			target.parentElement.className = target.checked ? '' : 'fail';
			target.title = 'Mark as ' + ( target.checked ? 'failed' : 'passed' );
		}
	}

	// show proper controls depending on type of a test
	if ( bender.testData.js ) {
		finishBtn.className += ' visible';
	} else {
		passBtn.className += ' visible';
	}

	bender.addListener( buttonsHolder, 'click', handleClick );

	// restore the old alert function
	window.alert = bender.oldAlert;

	//addCheckboxes();
} )();

var ManualLayout = function( domSelectors ) {
	var TEST_DESCRIPTION_MAX_WIDTH = 420,
		CONSOLE_MAX_HEIGHT = 400,
		MIN_SIZE = 80,
		LAYOUT_OPTIONS = {
			resize: false,
			type: 'border',
			hgap: 0,
			vgap: 0
		},
		COOKIE_SETTINGS = {
			expires: 365,
			path: '/'
		};

	var that = this;

	this.$topBar = null;
	this.$container = null;
	this.$testDescription = null;
	this.$consolePanel = null;

	this.fixSizes = function( saveSizes ) {
		this.$container.layout( LAYOUT_OPTIONS );
		saveSizes && this.saveSizes();
	};

	this.saveSizes = function() {
		$.cookie( 'test-description-hidden', Number( this.$testDescription.hasClass( 'hidden' ) ), COOKIE_SETTINGS );
		$.cookie( 'console-panel-hidden', Number( this.$consolePanel.hasClass( 'hidden' ) ), COOKIE_SETTINGS );
		$.cookie( 'test-description-width', this.$testDescription.css( 'width' ), COOKIE_SETTINGS );
		$.cookie( 'console-panel-height', this.$consolePanel.css( 'height' ), COOKIE_SETTINGS );
	};

	this.restoreSizes = function() {
		var testDescriptionHidden = Number( $.cookie( 'test-description-hidden' ) ),
			consolePanelHidden = Number( $.cookie( 'console-panel-hidden' ) ),
			testDescriptionWidth = $.cookie( 'test-description-width' ),
			consolePanelHeight = $.cookie( 'console-panel-height' );

		this.$testDescription.css( 'width', testDescriptionWidth || '' );
		this.$consolePanel.css( 'height', consolePanelHeight || '' );

		testDescriptionHidden && this.$testDescription.addClass( 'hidden' );
		consolePanelHidden && this.$consolePanel.addClass( 'hidden' );
	};

	this.enableButtons = function() {
		var that = this;
		$( '.layout-toggle' ).on( 'click', function( e ) {
			e.preventDefault();

			var $panel = $( '.' + $( this ).attr( 'rel' ) );
			$panel.toggleClass( 'hidden' );

			$( this ).toggleClass( 'active' );

			that.fixSizes( true );
		} ).each( function() {
			var $panel = $( '.' + $( this ).attr( 'rel' ) );

			if ( $panel.hasClass( 'hidden' ) ) {
				$( this ).removeClass( 'active' );
			}
		} );
	};

	this.init = function( domSelectors ) {
		var that = this;

		this.$container = $( domSelectors.container );
		this.$topBar = $( domSelectors.topBar ).addClass( 'north' );
		this.$testDescription = $( domSelectors.testDescription ).addClass( 'west' );
		this.$consolePanel = $( domSelectors.consolePanel ).addClass( 'south' );

		this.$container.layout( LAYOUT_OPTIONS );

		this.$consolePanel.resizable( {
			handles: 'n',
			minHeight: MIN_SIZE,
			maxHeight: CONSOLE_MAX_HEIGHT,
			stop: function() {
				that.fixSizes( true );
			}
		} );

		this.$testDescription.resizable( {
			handles: 'e',
			minWidth: MIN_SIZE,
			maxWidth: TEST_DESCRIPTION_MAX_WIDTH,
			stop: function() {
				that.fixSizes( true );
			}
		} );

		this.restoreSizes();

		this.enableButtons();

		$( window ).on( 'resize', function() {
			that.fixSizes( true );
		} );

		this.fixSizes( false );
	};

	this.init( domSelectors );
};

var oldConsoleLog = window.console.log;
window.console.log = function() {
	$( '#console' ).append( '<p>' + Array.prototype.slice.call( arguments ).join( ' ' ) + '</p>' );
	oldConsoleLog.apply( window.console, arguments );
};

var oldConsoleErr = window.console.error;
window.console.error = function() {
	$( '#console' ).append( '<p class="error">' + Array.prototype.slice.call( arguments ).join( ' ' ) + '</p>' );
	oldConsoleErr.apply( window.console, arguments );
};
