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
		launcher = opener || parent,
		collapseEl,
		resultsEl,
		statusEl,
		bender,
		init;

	function loadStyles( callback ) {
		var link = document.createElement( 'link' );

		link.rel = 'stylesheet';
		link.href = '/css/client.css';
		link.onload = callback;

		document.getElementsByTagName( 'head' )[ '0' ].appendChild( link );
	}

	function prepareResultsEl() {
		var summaryEl = document.createElement( 'div' ),
			allEl = document.createElement( 'a' );

		collapseEl = document.createElement( 'a' );

		summaryEl.className = 'summary';

		collapseEl.href = '#';
		collapseEl.className = 'btn collapse';
		collapseEl.title = 'Collapse the results';
		summaryEl.appendChild( collapseEl );

		allEl.href = '#';
		allEl.className = 'btn all';
		allEl.title = 'Run all tests';
		summaryEl.appendChild( allEl );

		statusEl = document.createElement( 'p' );
		statusEl.innerHTML = '<strong>Running...</strong>';
		summaryEl.appendChild( statusEl );

		resultsEl = document.createElement( 'div' );
		resultsEl.className = 'results';
		resultsEl.appendChild( summaryEl );


		if ( bender.testData.ui === 'none' ) {
			resultsEl.style.display = 'none';
		} else if ( bender.testData.ui === 'collapsed' ) {
			resultsEl.className = 'results collapsed';
			collapseEl.className = 'btn expand';
			collapseEl.title = 'Expand the results';
		}

		function handleClick( event ) {
			var target;

			event = event || window.event;

			if ( event.preventDefault ) {
				event.preventDefault();
			} else {
				event.returnValue = false;
			}

			target = event.target || event.srcElement;

			if ( target.tagName !== 'A' ) {
				return;
			}

			if ( target === collapseEl ) {
				handleCollapse();
			} else {
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

	function isCollapsed() {
		return ( resultsEl.className + '' ).indexOf( 'collapsed' ) > -1;
	}

	function handleCollapse() {
		var collapsed = isCollapsed();

		resultsEl.className = 'results' + ( collapsed ? '' : ' collapsed' );
		collapseEl.className = 'btn ' + ( collapsed ? 'collapse' : 'expand' );
		collapseEl.title = ( collapsed ? 'Collapse' : 'Expand' ) + ' the results';
	}

	function expandUI() {
		// nothing is shown
		if ( bender.testData.ui === 'none' ) {
			resultsEl.style.display = '';
			// results are collapsed
		} else if ( bender.testData.ui === 'collapsed' && isCollapsed() ) {
			resultsEl.className = 'results';
			collapseEl.className = 'btn collapse';
			collapseEl.title = 'Collapse the results';
		}
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
		var resEl = document.createElement( 'div' ),
			res = [
				'<p>',
				'<span class="icon ',
				result.success ? result.ignored ? 'ignored' : 'passed' : 'failed',
				'"></span>',
				result.module, ' - ',
				'<a href="#' + encodeURIComponent( result.name ) + '" class="single">' + result.name + '</a>',
				'</p>'
			],
			i;

		if ( !result.success ) {
			res.push( '<pre>', escapeTags( result.error ), '</pre>' );
		}

		resEl.className = 'result ' + ( result.success ? result.ignored ? 'warn' : 'ok' : 'fail' );
		resEl.innerHTML = res.join( '' );

		resultsEl.appendChild( resEl );
	}

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
			var resEl = document.createElement( 'div' );

			resEl.className = 'warn';
			resEl.innerHTML = '<p><span class="icon ignored"></span>Tests in <strong>' +
				result.module + '</strong> were ignored for current browser\'s version</p>';

			resultsEl.appendChild( resEl );

			statusEl.innerHTML = '<strong>Ignored</strong>';

			expandUI();
		};

		this.error = function( error ) {
			if ( supportsConsole ) {
				console.log( error.stack ? error.stack : error );
			}
		};

		this.next = function( result ) {
			statusEl.innerHTML = '<strong>Testing Done:</strong> ' +
				result.passed + ' passed, ' + result.failed + ' failed' +
				( result.ignored ? ', ' + result.ignored + ' ignored ' : ' ' ) +
				'in ' + result.duration + 'ms';

			expandUI();
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

	function setup() {
		bender.config = BENDER_CONFIG;
		bender.regressions = bender.testData && bender.config.tests[ bender.testData.group ].regressions;

		loadStyles( function() {
			prepareResultsEl();
			start();
		} );
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

		init = setup;
	}

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
