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
		failBtn = buttonEls[ 1 ],
		finishBtn = buttonEls[ 2 ],
		ignored = 0,
		errors = 0,
		total = 1,
		start = new Date(),
		oldStart = bender.start,
		oldNext = bender.next;

	bender.start = function() {};
	bender.next = function( data ) {
		disableButtons();
		oldNext( data );
	};

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
			total: total,
			coverage: window.__coverage__
		} );
	}

	function sendErrors() {
		var inputs = scriptEl.getElementsByTagName( 'input' ),
			checkboxes = [],
			result,
			input,
			len,
			i;

		function getMessage( checkbox ) {
			return checkbox.parentElement.innerText;
		}

		for ( i = 0, len = inputs.length; i < len; i++ ) {
			if ( ( input = inputs[ i ] ) && input.type === 'checkbox' && !input.checked ) {
				checkboxes.push( input );
			}
		}

		for ( i = 0, len = checkboxes.length; i < len; i++ ) {
			result = {
				success: false,
				errors: 1,
				error: getMessage( checkboxes[ i ] ),
				module: bender.testData.id,
				fullName: bender.testData.id,
				name: '',
				duration: 0
			};

			bender.result( result );
		}
	}

	function disableButtons() {
		var len = buttonEls.length,
			i;

		for ( i = 0; i < len; i++ ) {
			buttonEls[ i ].disabled = true;
			buttonEls[ i ].className += ' disabled';
		}
	}

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
	}

	function addCheckbox( elem ) {
		var checkbox = document.createElement( 'input' );
		checkbox.type = 'checkbox';
		checkbox.checked = true;
		checkbox.className = 'fail-check';

		elem.insertBefore( checkbox, elem.firstChild );
	}

	function addCheckboxes() {
		var elems = scriptEl.getElementsByTagName( 'li' ),
			len = elems.length,
			i;

		for ( i = 0; i < len; i++ ) {
			addCheckbox( elems[ i ] );
		}
	}

	if ( bender.testData.unit ) {
		finishBtn.className += ' visible';
	} else {
		passBtn.className += ' visible';
	}

	addCheckboxes();

	bender.addListener( sidebarEl, 'click', handleClick );

} )();
