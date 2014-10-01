/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

( function() {
	'use strict';

	var sidebarEl = document.getElementById( 'manual-sidebar' ),
		scriptEl = document.getElementById( 'manual-script' ),
		buttonEls = sidebarEl.getElementsByTagName( 'button' ),
		passBtn = buttonEls[ 0 ],
		finishBtn = buttonEls[ 1 ],
		failBtn = buttonEls[ 2 ],
		ignored = 0,
		errors = 0,
		start = new Date(),
		oldStart = bender.start,
		oldNext = bender.next;

	// override default Bender API
	bender.start = function() {};
	bender.next = function( data ) {
		disableButtons();
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
			duration: new Date() - start,
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
			if ( ( input = inputs[ i ] ) &&
				input.type === 'checkbox' && !input.checked ) {

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

		if ( target === finishBtn && bender.testData.unit ) {
			oldStart();
		}

		if ( target.className === 'fail-check' ) {
			target.parentElement.className = target.checked ? '' : 'fail';
			target.title = 'Mark as ' + ( target.checked ? 'failed' : 'passed' );
		}
	}

	/**
	 * Add a checkbox to the element
	 * @param {Element} elem DOM element
	 */
	function addCheckbox( elem ) {
		var checkbox = document.createElement( 'input' );

		checkbox.type = 'checkbox';
		checkbox.checked = true;
		checkbox.className = 'fail-check';
		checkbox.title = 'Mark as failed';

		elem.insertBefore( checkbox, elem.firstChild );
	}

	/**
	 * Add checkboxes to all list items in the manual test sidebar
	 */
	function addCheckboxes() {
		var elems = scriptEl.getElementsByTagName( 'li' ),
			len = elems.length,
			i;

		for ( i = 0; i < len; i++ ) {
			addCheckbox( elems[ i ] );
		}
	}

	// show proper controls depending on type of a test
	if ( bender.testData.unit ) {
		finishBtn.className += ' visible';
	} else {
		passBtn.className += ' visible';
	}


	// bind a click handler
	bender.addListener( sidebarEl, 'click', handleClick );

	addCheckboxes();
} )();
