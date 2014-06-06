/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

( function() {
	'use strict';

	var isIE = navigator.userAgent.toLowerCase().indexOf( 'trident' ) > -1,
		ieVersion = navigator.userAgent.match( /msie (\d+)/i ),
		isOldIE = isIE && ieVersion && Number( ieVersion[ 1 ] ) < 9,
		testId = window.location.pathname
		.replace( /^(\/(?:tests|single|(?:jobs\/(?:\w+)\/tests))\/)/i, '' ),
		supportsConsole = !!( window.console && window.console.log ),
		resultsEl;


	function prepareResultsEl() {
		resultsEl = document.createElement( 'div' );
		resultsEl.className = 'results';

		function handleClick( event ) {
			var target;

			event = event || window.event;

			event.preventDefault();

			target = event.target || event.srcElement;

			if ( target.tagName !== 'A' ) {
				return;
			}

			if ( target.className === 'single' || target.className === 'all' ) {
				window.location = target.href;
				window.location.reload();
			}
		}

		if ( resultsEl.addEventListener ) {
			resultsEl.addEventListener( 'click', handleClick, false );
		} else if ( resultsEl.attachEvent ) {
			resultsEl.attachEvent( 'onclick', handleClick );
		} else {
			resultsEl.onclick = handleClick;
		}

		document.body.appendChild( resultsEl );
	}

	function escapeTags( str ) {
		var replacements = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;'
		};

		return str.replace( /[&<>]/g, function( item ) {
			return replacements[ item ] || item;
		} );
	}

	function addResult( result ) {
		var resEl = document.createElement( 'li' ),
			res = [
				'<p>', result.module, ' - ', result.name,
				' <strong>',
				result.success ? result.ignored ? 'IGNORED' : 'PASSED' : 'FAILED',
				'</strong>',
				' <a href="#' + encodeURIComponent( result.name ) + '" class="single">#</a>',
				'</p>'
			],
			i;

		if ( !result.success ) {
			res.push( '<pre>', escapeTags( result.error ), '</pre>' );
		}

		resEl.className = result.success ? result.ignored ? 'warn' : 'ok' : 'fail';
		resEl.innerHTML = res.join( '' );

		resultsEl.appendChild( resEl );
	}

	var launcher = opener || parent,
		bender,
		init;

	function Bender() {
		this.result = function( result ) {
			if ( !result.success && supportsConsole ) {
				console.log( result.module + ' - ' + result.name + ' FAILED\n' + result.error );
			}
			addResult( result );
		};

		this.log = function( message ) {
			if ( supportsConsole ) {
				console.log( message );
			}
		};

		this.ignore = function( result ) {
			var resEl = document.createElement( 'li' );

			resEl.className = 'warn';
			resEl.innerHTML = '<p><strong>IGNORED</strong> Tests in <strong>' +
				result.module + '</strong> were ignored for current browser\'s version</p>';

			resultsEl.appendChild( resEl );
		};

		this.error = function( error ) {
			if ( supportsConsole ) {
				console.log( error.stack ? error.stack : error );
			}
		};

		this.next = function( result ) {
			var resEl = document.createElement( 'li' );

			resEl.className = 'info';
			resEl.innerHTML = '<p><strong>Testing Done:</strong> ' +
				result.passed + ' passed, ' + result.failed + ' failed' +
				( result.ignored ? ', ' + result.ignored + ' ignored ' : ' ' ) +
				'in ' + result.duration + 'ms ' +
				'<a href="#" class="all">all</a>' + '</p>';

			resultsEl.appendChild( resEl );
		};

		this.start = this.complete = function() {};

	}

	function start() {
		if ( bender.ignoreOldIE && isOldIE ) {
			bender.ignore( {
				module: testId
			} );
		} else {
			bender.start();
		}
	}

	if ( launcher && launcher.bender && launcher.bender.runAsChild && window.location.hash === '#child' ) {
		bender = {
			result: function( result ) {
				launcher.bender.result( JSON.stringify( result ) );
			},
			next: function( result ) {
				launcher.bender.next( JSON.stringify( result ) );
			},
			ignore: function( result ) {
				launcher.bender.ignore( JSON.stringify( result ) );
			},
			log: function( message ) {
				launcher.bender.log( message );
			},
			error: function( error ) {
				launcher.bender.error( JSON.stringify( error.stack ? error.stack : error ) );
			}
		};

		window.error = function( error ) {
			launcher.bender.error( JSON.stringify( error.stack ? error.stack : error ) );
		};

		init = start;
	} else {
		bender = new Bender();
		init = function() {
			prepareResultsEl();
			start();
		};
	}

	bender.config = BENDER_CONFIG;

	window.alert = bender.log;
	window.bender = bender;

	if ( window.addEventListener ) {
		window.addEventListener( 'load', init, false );
	} else if ( window.attachEvent ) {
		window.attachEvent( 'onload', init );
	} else {
		window.onload = init;
	}
} )();
