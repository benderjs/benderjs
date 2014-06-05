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
			testTimeout = null,
			testWindow = null,
			runs = 0,
			that = this;

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
				}
				window.location.reload();
			}, BENDER_CONFIG.testTimeout );
		}

		this.error = function( error ) {
			socket.emit( 'error', JSON.parse( error ) );
		};

		this.result = function( result ) {
			result = JSON.parse( result );

			if ( !result.success ) {
				this.results.success = false;
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
							window.open( id, 'bendertest' );
						}, 300 );
					} else {
						testWindow = window.open( id, 'bendertest' );
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

		// override logs and alerts
		// TODO move to clients code if needed
		//     this.setup = function (context, steal) {
		//         if (steal) context.onerror = this.error;

		//         function stealLogs() {
		//             var commands = ['log', 'info', 'warn', 'debug', 'error'],
		//                 replace = function(command) {
		//                     var old = context.console[command];

		//                     context.console[command] = function () {
		//                         that.log(arguments);
		//                         if (old) Function.prototype.apply.call(old, context.console, arguments);
		//                     };
		//                 },
		//                 i;

		//             context.console = context.console || {};

		//             for (i = 0; i < commands.length; i++) {
		//                 replace(commands[i]);
		//             }

		//             context.alert = function (msg) {
		//                 that.log(msg);
		//             };
		//         }

		//         if (steal) stealLogs();
		//     };

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
