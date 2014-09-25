var sidebarEl = document.getElementById( 'manual-sidebar' ),
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

if ( bender.testData.unit ) {
	finishBtn.className += ' visible';
} else {
	passBtn.className += ' visible';
}

bender.addListener( sidebarEl, 'click', handleClick );
