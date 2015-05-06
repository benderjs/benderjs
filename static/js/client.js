/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Common client script, loaded for every test page
 */

/* global console */

( function() {
	'use strict';

	var launcher = opener || parent,
		defermentId = 0,
		deferments = [],
		ready = false,
		defermentTimeout,
		collapseEl,
		resultsEl,
		statusEl,
		bender,
		init;

	/**
	 * Load additional stylesheet needed for single test runs
	 */
	function loadStyles() {
		var link = document.createElement( 'link' );

		link.rel = 'stylesheet';
		link.href = '/css/client.css';

		document.getElementsByTagName( 'head' )[ '0' ].appendChild( link );
	}

	/**
	 * Prepare UI elements used in single test runs.
	 */
	function prepareResultsEl() {
		var summaryEl,
			allEl,
			failedEl;

		// summary box that sticks to the top of the window
		summaryEl = document.createElement( 'div' );
		summaryEl.className = 'summary';

		// collapse results button
		collapseEl = document.createElement( 'a' );
		collapseEl.href = '#';
		collapseEl.className = 'btn collapse';
		collapseEl.title = 'Collapse the results';
		summaryEl.appendChild( collapseEl );

		// show tests that failed only
		failedEl = document.createElement( 'a' );
		failedEl.href = '#';
		failedEl.className = 'btn failed';
		failedEl.title = 'Show failed tests';
		summaryEl.appendChild( failedEl );

		// run all tests button
		allEl = document.createElement( 'a' );
		allEl.href = '#';
		allEl.className = 'btn runall';
		allEl.title = 'Run all tests';
		summaryEl.appendChild( allEl );

		// test status located in summary box
		statusEl = document.createElement( 'p' );
		statusEl.innerHTML = '<strong>Running...</strong>';
		summaryEl.appendChild( statusEl );

		// test results box
		resultsEl = document.createElement( 'div' );
		resultsEl.className = 'results';
		resultsEl.appendChild( summaryEl );

		// handle bender-ui directive
		// hide all results till the end of the tests
		if ( bender.testData.ui !== 'none' ) {
			if ( bender.testData.ui === 'collapsed' ) {
				resultsEl.className = 'results collapsed';
				collapseEl.className = 'btn expand';
				collapseEl.title = 'Expand the results';
			}

			document.body.appendChild( resultsEl );
		}

		// handle all clicks in results box
		function handleClick( event ) {
			var target,
				collapsed,
				failed,
				resultsElClassName;

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

			// Trim className; trim() function is not available on IE8.
			resultsElClassName = ( resultsEl.className + '' ).replace( /^\s+|\s+$/g, '' );

			if ( target === collapseEl ) {
				collapsed = isCollapsed();
				collapseEl.className = 'btn ' + ( collapsed ? 'collapse' : 'expand' );
				collapseEl.title = ( collapsed ? 'Collapse' : 'Expand' ) + ' the results';

				resultsElClassName = resultsElClassName.replace(
					collapsed ? 'collapsed' : /$/,
					collapsed ? '' : ' collapsed' );
			} else if ( target === failedEl ) {
				failed = isFailed();
				failedEl.className = 'btn ' + ( failed ? 'failed' : 'all' );
				failedEl.title = failed ? 'Show failed tests' : 'Show all tests';

				resultsElClassName = resultsElClassName.replace(
					failed ? 'failed' : /$/,
					failed ? '' : ' failed' );
			} else {
				window.location = target.href;
				window.location.reload();
			}

			resultsEl.className = resultsElClassName;
		}

		bender.addListener( resultsEl, 'click', handleClick );
	}

	/**
	 * Check if the results box is collapsed
	 * @return {Boolean}
	 */
	function isCollapsed() {
		return ( resultsEl.className + '' ).indexOf( 'collapsed' ) > -1;
	}

	/**
	 * Check if the results box shows failed tests only
	 * @return {Boolean}
	 */
	function isFailed() {
		return ( resultsEl.className + '' ).indexOf( 'failed' ) > -1;
	}

	/**
	 * Expand single test UI if it was hidden or collapsed before
	 */
	function expandUI() {
		// nothing is shown
		if ( bender.testData.ui === 'none' ) {
			document.body.appendChild( resultsEl );
			// results are collapsed
		} else if ( bender.testData.ui === 'collapsed' && isCollapsed() ) {
			resultsEl.className = 'results';
			collapseEl.className = 'btn collapse';
			collapseEl.title = 'Collapse the results';
		}
	}

	/**
	 * Escape &, > and < characters to HTML entities
	 * @param  {String} str String to escape
	 * @return {String}
	 */
	function escapeTags( str ) {
		var replacements = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;'
		};

		if ( typeof str !== 'string' ) {
			return str;
		}

		return str.replace( /[&<>]/g, function( item ) {
			return replacements[ item ] || item;
		} );
	}

	/**
	 * Add a result to the results box
	 * @param {Object} result Result object received from assertion library
	 */
	function addResult( result ) {
		var resEl = document.createElement( 'div' ),
			res = [
				'<p>',
				'<span class="icon ',
				result.success ? result.ignored ? 'ignored' : 'passed' : 'failed',
				'"></span>',
				escapeTags( result.module ), result.name ? ' ' : '',
				'<a href="#', encodeURIComponent( result.fullName || result.name ), '" class="single">',
				escapeTags( result.name ),
				'</a>',
				'</p>'
			];

		if ( !result.success ) {
			res.push( '<pre>', escapeTags( result.error ), '</pre>' );
		}

		resEl.className = 'result ' + ( result.success ? result.ignored ? 'warn' : 'ok' : 'fail' );
		resEl.innerHTML = res.join( '' );

		resultsEl.appendChild( resEl );
	}

	/**
	 * Formats a timestap given in milliseconds to a readable form
	 * @param  {Number} ms Timestamp
	 * @return {String}
	 */
	function formatTime( ms ) {
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
			( ( s || m || h ) ? ms < 10 ?
				'00' : ms < 100 ? '0' : '' :
				'' ) + ms + 'ms';
	}

	/**
	 * Local Bender class
	 * @constructor
	 */
	function Bender() {
		this.result = function( result ) {
			if ( !result.success && bender.env.supportsConsole ) {
				console.log( result.module + ' ' + result.name + ' FAILED\n' + result.error );
			}
			addResult( result );
		};

		this.log = function( message ) {
			if ( bender.env.supportsConsole ) {
				console.log( message );
			}
		};

		this.ignore = function( result ) {
			var resEl = document.createElement( 'div' );

			result = result || {
				module: bender.testData.id
			};

			resEl.className = 'warn';
			resEl.innerHTML = '<p><span class="icon ignored"></span>Tests in <strong>' +
				result.module + '</strong> were ignored for current browser\'s version</p>';

			if ( !resultsEl ) {
				prepareResultsEl();
			}

			resultsEl.appendChild( resEl );

			statusEl.innerHTML = '<strong>Ignored</strong>';

			expandUI();
		};

		this.error = function( error ) {
			var resEl = document.createElement( 'div' );

			if ( !resultsEl ) {
				prepareResultsEl();
			}

			if ( error.error ) {
				resEl.className = 'result fail';
				resEl.innerHTML = '<p><span class="icon failed"></span>Error' +
					( error.methodName ? ( ' in ' + error.methodName ) : '' ) +
					( '<pre>' + escapeTags( error.error ? error.error.message : error.message ) + '</pre>' ) +
					'</p>';

				resultsEl.appendChild( resEl );

				bender.stopRunner();
				expandUI();

				// temporary solution
				// log the error event to simplify debugging - V8 has issues with rethrowing errors
				// that causes the original stack to be lost
				if ( bender.env.supportsConsole ) {
					console.log( error );
				}

				throw ( error.error );
			} else {
				resEl.className = 'result fail';
				resEl.innerHTML = '<p><span class="icon failed"></span>Error<pre>' + escapeTags( error ) + '</pre></p>';

				resultsEl.appendChild( resEl );

				if ( bender.env.supportsConsole ) {
					console.log( error.stack ? error.stack : error.error ? error.error : error );
				}
			}
		};

		this.next = function( result ) {
			statusEl.innerHTML = '<strong>Testing Done:</strong> ' +
				result.passed + ' passed, ' + result.failed + ' failed' +
				( result.ignored ? ', ' + result.ignored + ' ignored ' : ' ' ) +
				'in ' + formatTime( result.duration );

			expandUI();
		};

		this.start = this.complete = function() {};
	}

	/**
	 * Check for ignored tests and handle test start
	 */
	function start() {
		ready = true;

		var oldOnError = window.onerror;

		window.onerror = function( error ) {
			if ( oldOnError ) {
				oldOnError( error );
			}

			bender.error( error );
		};

		if ( bender.ignoreOldIE && bender.env.ie && bender.env.version && bender.env.version < 9 ) {
			bender.ignore( {
				module: bender.testData.id
			} );
		} else {
			// maximize the IFRAME containing a test page when running a manual test
			if ( bender.testData.manual && bender.maximize ) {
				bender.maximize();
			}

			// start test framework if no deferred callbacks
			if ( !deferments.length ) {
				bender.start();
			}
		}
	}

	// test file is running in a popup or iframe, bender will be a proxy to parent window
	if ( launcher && launcher.bender && launcher.bender.runAsChild && window.location.hash === '#child' ) {
		bender = {
			result: function( result ) {
				launcher.bender.result( JSON.stringify( result ) );
			},
			next: function( result ) {
				launcher.bender.next( JSON.stringify( result ) );
			},
			ignore: function( result ) {
				result = result || {
					module: bender.testData.id
				};

				launcher.bender.ignore( JSON.stringify( result ) );
			},
			log: function( message ) {
				launcher.bender.log( message );
			},
			error: function( error ) {
				launcher.bender.error(
					JSON.stringify( error.stack ? error.stack : error.error ? error.error.stack : error )
				);

				return true;
			},
			maximize: function() {
				if ( launcher.bender.maximize ) {
					launcher.bender.maximize();
				}
			}
		};

		init = start;
		// standalone run, local instance of Bender and additional CSS is needed
	} else {
		bender = new Bender();

		loadStyles();

		init = function() {
			prepareResultsEl();
			start();
		};
	}

	bender.config = window.BENDER_CONFIG;

	/**
	 * Attach an event listener to a target
	 * @param {Element}  target  Target element
	 * @param {String}   event   Name of an event to attach to
	 * @param {Function} handler Handler function
	 */
	bender.addListener = function( target, event, handler ) {
		if ( target.addEventListener ) {
			target.addEventListener( event, handler, false );
		} else if ( target.attachEvent ) {
			target.attachEvent( 'on' + event, handler );
		} else {
			target[ 'on' + event ] = handler;
		}
	};

	/**
	 * Detach an event listener from a target
	 * @param  {Element}  target  Target element
	 * @param  {String}   event   Name of an event
	 * @param  {Function} handler Handler function
	 */
	bender.removeListener = function( target, event, handler ) {
		if ( target.removeEventListener ) {
			target.removeEventListener( event, handler, false );
		} else if ( target.detachEvent ) {
			target.detachEvent( 'on' + event, handler );
		} else {
			target[ 'on' + event ] = null;
		}
	};

	/**
	 * Reset deferment unlock timeout
	 */
	function resetDefermentTimeout() {
		clearTimeout( defermentTimeout );

		defermentTimeout = setTimeout( function() {
			throw new Error( 'Deferment unlock timeout - "' + deferments.join( ', ' ) + '" never unlocked' );
		}, bender.config.defermentTimeout );
	}

	/**
	 * Remove a name from the deferred callbacks stack and start Bender if no more callbacks to wait for
	 * @param {String} name Name of the unlocked deferment
	 */
	function unlock( name ) {
		// remove name from the list
		for ( var i = deferments.length; i >= 0; i-- ) {
			if ( deferments[ i ] === name ) {
				deferments.splice( i, 1 );
			}
		}

		// no more deffered callback to wait for
		if ( !deferments.length ) {
			clearTimeout( defermentTimeout );
		}

		// the DOM is ready so we can start
		if ( !deferments.length && ready ) {
			bender.start();
		}
	}


	var oldOnError = window.onerror;

	window.onerror = function( error ) {
		if ( oldOnError ) {
			oldOnError( error );
		}

		// clear the deferment timeout to avoid error stack pollution
		if ( defermentTimeout !== undefined ) {
			clearTimeout( defermentTimeout );
		}
	};

	/**
	 * Defer the startup of Bender tests
	 * @param {String} name A unique name of a deferment, should match a plugin's name
	 * @return {Function} Unlock function
	 */
	bender.defer = function( name ) {
		// use a unique ID if no name was provided
		// this is a temporary solution until all the plugins have their names defined
		name = name || defermentId++;

		// add to the deferment list
		deferments.push( name );

		// setup a timeout
		resetDefermentTimeout();

		// return the unlock function
		return function() {
			unlock( name );
		};
	};

	// save a reference to the original alert function
	bender.oldAlert = window.alert;

	// override alerts to throw errors instead of displaying a message and blocking the test execution
	window.alert = function( msg ) {
		throw {
			message: 'window.alert: ' + msg
		};
	};

	var env = window.bender.env;
	window.bender = bender;
	window.bender.env = env;

	bender.addListener( window, 'load', init );
} )();
