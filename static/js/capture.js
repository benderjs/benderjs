/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Runner code for captured browser
 */

( function() {
	'use strict';

	var statusEl = document.getElementById( 'status' ),
		isIE = navigator.userAgent.toLowerCase().indexOf( 'trident' ) > -1,
		fetchInterval = null,
		states = {
			CONNECT: 0,
			RECONNECT: 1,
			RECONNECT_FAIL: 2,
			RECONNECTING: 3,
			DISCONNECT: 4
		},
		socket;

	function Bender( socket ) {
		var contextEl = document.getElementById( 'context' ),
			that = this,
			runs = 0,
			testTimeout,
			testWindow,
			lastError;

		this.running = false;
		this.results = null;

		this.runAsChild = true;

		function clearTestTimeout() {
			if ( testTimeout ) {
				clearTimeout( testTimeout );
			}
		}

		function resetTestTimeout() {
			if ( !BENDER_CONFIG && !BENDER_CONFIG.testTimeout ) {
				return;
			}

			clearTestTimeout();

			testTimeout = setTimeout( function() {
				// reload the page if frozen
				if ( testWindow ) {
					testWindow.close();
					testWindow = null;
				}
				window.location.reload();
			}, BENDER_CONFIG.testTimeout );
		}

		this.error = function( error ) {
			lastError = JSON.parse( error );
			socket.emit( 'error', lastError );
		};

		this.result = function( result ) {
			result = JSON.parse( result );

			if ( !result.success ) {
				this.results.success = false;

				if ( lastError ) {
					result.error += '\n\n' + lastError;
					lastError = null;
				}
			}

			this.results.results[ result.name ] = result;

			resetTestTimeout();
		};

		this.run = function( id ) {
			var frame;

			if ( typeof id == 'string' ) {
				runs++;

				id += '#child';

				if ( isIE ) {
					if ( runs >= 20 && testWindow ) {
						testWindow.close();
						setTimeout( function() {
							runs = 0;
							testWindow = window.open( id, 'bendertest' );
						}, 300 );
					} else {
						if ( !testWindow || testWindow.closed ) {
							testWindow = window.open( id, 'bendertest' );
						} else {
							if ( id === testWindow.location.href.split( testWindow.location.host )[ 1 ] ) {
								testWindow.location.reload();
							} else {
								testWindow.location.href = id;
							}
						}
					}
				} else {
					if ( ( frame = contextEl.getElementsByTagName( 'iframe' )[ 0 ] ) ) {
						frame.src = 'about:blank';
						contextEl.removeChild( frame );
					}

					frame = document.createElement( 'iframe' );
					frame.className = 'context-frame';
					frame.src = id;
					contextEl.appendChild( frame );
				}

				resetTestTimeout();
			}
		};

		this.ignore = function( result ) {
			this.results.success = false;
			this.complete();
		};

		this.next = this.complete = function() {
			var frame;

			clearTestTimeout();

			socket.emit( 'complete', this.results );

			if ( !isIE ) {
				frame = contextEl.getElementsByTagName( 'iframe' )[ 0 ];

				if ( frame ) {
					frame.src = 'about:blank';
					contextEl.removeChild( frame );
				}
			}

			this.running = false;
			this.results = null;

			socket.emit( 'fetch' );
		};

		this.log = function() {
			socket.emit( 'log', Array.prototype.join.call( arguments, ' ' ) );
		};

		this.stop = function() {
			// close everything on disconnect
			if ( this.running ) {
				this.running = false;
				if ( isIE && testWindow ) {
					testWindow.close();
					testWindow = null;
				} else {
					if ( ( frame = contextEl.getElementsByTagName( 'iframe' )[ 0 ] ) ) {
						frame.src = 'about:blank';
						contextEl.removeChild( frame );
					}
				}
			}
		};

		// handle socket run message
		socket.on( 'run', function( data ) {
			data.results = {};
			data.success = true;

			that.results = data;
			that.running = true;

			that.run( data.id );
		} );
	}

	function startFetch() {
		fetchInterval = setInterval( function() {
			if ( !bender.running ) {
				socket.emit( 'fetch' );
			}
		}, 2000 );
	}

	function stopFetch() {
		if ( fetchInterval ) {
			clearInterval( fetchInterval );
		}

		bender.stop();
	}

	function setStatus( status ) {
		var messages = [
			'Connected', 'Reconnected', 'Failed to reconnect',
			'Reconnecting in ', 'Disconnected'
		];

		return function( options ) {
			statusEl.innerHTML = messages[ status ] + ( options ? options + 'ms...' : '' );
			statusEl.className = status === states.CONNECT ? 'ok' :
				( status === states.RECONNECT || status === states.RECONNECTING ) ? 'warn' :
				( status === states.RECONNECT_FAIL || states.DISCONNECT ) ? 'fail' : '';
		};
	}

	socket = io.connect(
		'http://' + window.location.hostname + ':' + ( window.location.port || 80 ) + '/client', {
			'reconnection delay': 2000,
			'reconnection limit': 2000,
			'max reconnection attempts': Infinity
		}
	);

	// handle socket connection status
	socket
		.on( 'connect', setStatus( states.CONNECT ) )
		.on( 'connect', function() {
			var id = /\/clients\/([^\/]+)/.exec( window.location )[ 1 ];

			socket.emit( 'register', {
				id: id,
				ua: navigator.userAgent
			}, startFetch );


		} )
		.on( 'reconnect', setStatus( states.RECONNECT ) )
		.on( 'reconnect_failed', setStatus( states.RECONNECT_FAIL ) )
		.on( 'reconnecting', setStatus( states.RECONNECTING ) )
		.on( 'disconnect', setStatus( states.DISCONNECT ) )
		.on( 'disconnect', stopFetch );

	window.bender = new Bender( socket );

} )();
