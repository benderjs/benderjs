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

		function handleRun( data ) {
			if ( !data ) {
				return;
			}

			data.results = {};
			data.success = true;
			data.resultCount = 0;

			that.results = data;
			that.running = true;

			that.run( data.id[ 0 ] === '/' ? data.id : '/' + data.id );
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
			this.results.resultCount++;

			socket.emit( 'result', result );

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

		this.ignore = function() {
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
			this.results.coverage = parsed.coverage;

			if ( !this.results.resultCount ) {
				this.results.success = false;
			}

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
		};

		this.log = function() {
			socket.emit( 'log', Array.prototype.join.call( arguments, ' ' ) );
		};

		this.stop = function() {
			var frame;
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
				} );
			} )
			.on( 'disconnect', function() {
				that.stop();
				clearTestTimeout();
			} )
			.on( 'run', handleRun );
	}

	function setStatus( status ) {
		return function() {
			statusEl.innerHTML = status === states.CONNECT ? 'Connected' : 'Disconnected';
			statusEl.className = status === states.CONNECT ? 'ok' : 'fail';
		};
	}

	socket = io.connect( '/client', {
		'reconnection delay': 2000,
		'reconnection limit': 2000,
		'max reconnection attempts': Infinity
	} );

	// handle socket connection status
	socket
		.on( 'connect', setStatus( states.CONNECT ) )
		.on( 'disconnect', setStatus( states.DISCONNECT ) );

	window.bender = new Bender( socket );

	function disconnect() {
		socket.disconnect();
	}

	if ( window.addEventListener ) {
		window.addEventListener( 'unload', disconnect, false );
	} else if ( window.attachEvent ) {
		window.attachEvent( 'onunload', disconnect );
	} else {
		window.onunload = disconnect;
	}
} )();
