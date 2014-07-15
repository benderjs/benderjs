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
			DISCONNECT: 1
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
		this.fetching = false;
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

		function handleFetch( data ) {
			that.fetching = false;

			if ( !data ) {
				return;
			}

			data.results = {};
			data.success = true;

			that.results = data;
			that.running = true;

			that.run( data.id );
		}

		function startFetch() {
			fetchInterval = setInterval( function() {
				if ( !bender.running && !bender.fetching ) {
					bender.fetching = true;
					socket.emit( 'fetch', handleFetch );
				}
			}, 2000 );
		}

		function stopFetch() {
			if ( fetchInterval ) {
				clearInterval( fetchInterval );
			}

			bender.stop();
		}

		this.error = function( error ) {
			lastError = JSON.parse( error );
			socket.emit( 'err', lastError );
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
			this.results.success = true;
			this.results.ignored = true;
			this.results.duration = 0;
			this.complete( '{"duration":0}' );
		};

		this.next = this.complete = function( result ) {
			var parsed = JSON.parse( result ),
				frame;

			clearTestTimeout();

			this.results.duration = parsed.duration;

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

			if ( !this.fetching ) {
				socket.emit( 'fetch', handleFetch );
			}
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

		socket
			.on( 'connect', function() {
				var id = /\/clients\/([^\/]+)/.exec( window.location )[ 1 ];

				socket.emit( 'register', {
					id: id,
					ua: navigator.userAgent
				}, startFetch );
			} )
			.on( 'disconnect', stopFetch );
	}

	function setStatus( status ) {
		return function() {
			statusEl.innerHTML = status === states.CONNECT ? 'Connected' : 'Disconnected';
			statusEl.className = status === states.CONNECT ? 'ok' : 'fail';
		};
	}

	socket = io(
		'http://' + window.location.hostname + ':' + ( window.location.port || 80 ) + '/client', {
			reconnection: true,
			reconnectionDelay: 2000,
			reconnectionDelayMax: 2000
		}
	);

	// handle socket connection status
	socket
		.on( 'connect', setStatus( states.CONNECT ) )
		.on( 'disconnect', setStatus( states.DISCONNECT ) );

	window.bender = new Bender( socket );

	function disconnect() {
		socket.disconnect();
	}

	if ( window.addEventListener ) {
		window.addEventListener( 'load', disconnect, false );
	} else if ( window.attachEvent ) {
		window.attachEvent( 'onload', disconnect );
	} else {
		window.onload = disconnect;
	}
} )();
