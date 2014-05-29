( function() {
	'use strict';

	var resultsEl = document.createElement( 'div' ),
		isIE = navigator.userAgent.match( /msie (\d+)/i ),
		isOldIE = isIE && Number( isIE[ 1 ] ) < 9,
		testId = window.location.pathname
		.replace( /^(\/(?:tests|single|(?:jobs\/(?:\w+)\/tests))\/)/i, '' );

	resultsEl.className = 'results';

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
				'<strong> ', result.success ? result.ignored ?
				'IGNORED' : 'PASSED' : 'FAILED', '</strong></p>'
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
			addResult( result );
		};

		this.log = function( mesasge ) {
			console.log( message );
		};

		this.ignore = function( result ) {
			var resEl = document.createElement( 'li' );

			resEl.className = 'warn';
			resEl.innerHTML = '<p><strong>IGNORED</strong> Tests in <strong>' +
				result.module + '</strong> were ignored for current browser\'s version</p>';

			resultsEl.appendChild( resEl );
		};

		this.start = this.next = this.complete = function() {};
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

	if ( launcher && launcher.bender && launcher.bender.runAsChild ) {
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
			}
		};

		window.error = function( error ) {
			launcher.bender.error( JSON.stringify( error ) );
		};

		init = start;
	} else {
		bender = new Bender();
		init = function() {
			document.body.appendChild( resultsEl );
			start();
		};
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
