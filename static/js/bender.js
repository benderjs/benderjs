( function( window ) {
	'use strict';

	var isIE = navigator.userAgent.match( /msie (\d+)/i ),
		supportsConsole = !!( window.console && window.console.log );

	function Bender() {
		var contextEl = document.getElementById( 'context' ),
			testWindow = null,
			runs = 0;

		this.handlers = {};
		this.current = null;
		this.suite = null;

		this.runAsChild = true;

		this.emit = function( name ) {
			var handlers = this.handlers[ name ],
				args = Array.prototype.slice.call( arguments, 1 ),
				i;

			if ( !handlers || !handlers.length ) {
				return;
			}

			for ( i = 0; i < handlers.length; i++ ) {
				handlers[ i ].apply( this, args );
			}
		};

		this.on = function( name, callback ) {
			if ( typeof name !== 'string' || typeof callback != 'function' ) {
				throw new Error( 'Invalid arguments specified' );
			}

			if ( !this.handlers[ name ] ) {
				this.handlers[ name ] = [];
			}

			this.handlers[ name ].push( callback );
		};

		this.error = function( error ) {
			if ( supportsConsole ) {
				console.error( JSON.parse( error ) );
			}
		};

		this.log = function( message ) {
			if ( supportsConsole ) {
				console.log( message );
			}
		};

		// stubbed for compatibility
		this.result = function( result ) {
			result = JSON.parse( result );

			if ( !result.success && supportsConsole ) {
				console.log( result );
			}
		};

		this.next = function( summary ) {
			var id,
				frame,
				parsed;

			if ( summary ) {
				parsed = JSON.parse( summary );
				parsed.id = this.current;
				parsed.success = parsed.failed === 0;
				this.emit( 'update', parsed );
			}

			this.current = this.suite.shift();

			if ( this.current ) {
				id = '/tests/' + this.current;
				runs++;

				this.emit( 'update', this.current );

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
			} else {
				this.complete();
			}
		};

		this.complete = function() {
			var frame;
			this.emit( 'complete' );

			this.suite = [];
			this.current = null;

			if ( isIE && testWindow ) {
				testWindow.close();
			} else {
				frame = contextEl.getElementsByTagName( 'iframe' )[ 0 ];

				if ( frame ) {
					frame.src = 'about:blank';
					contextEl.removeChild( frame );
				}
			}
		};

		this.ignore = function( result ) {
			result = JSON.parse( result );

			result.passed = 0;
			result.failed = 0;
			result.ignored = 1;
			result.duration = 0;
			result.id = this.current;

			this.next( JSON.stringify( result ) );
		};

		this.run = function( tests ) {
			this.suite = tests;
			this.next();
		};

		this.stop = this.complete;
	}

	window.bender = new Bender();
} )( this );
