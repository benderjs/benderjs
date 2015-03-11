/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

( function() {
	var env = {},
		ua = navigator.userAgent;

	env.supportsConsole = !!( window.console && window.console.log );

	env.trident = ua.toLowerCase().indexOf( 'trident' ) > -1;

	env.spartan = ( /edge[ \/]\d+.?\d*/ ).test( ua.toLowerCase() );

	env.ie = env.trident || env.spartan;

	var version;
	if ( env.trident ) {
		version = ua.match( /msie (\d+)/i );
		env.version = ( version ? Number( version[ 1 ] ) : document.documentMode );
	}

	if ( env.spartan ) {
		version = ua.match( /edge\/(\d+)/i );
		env.version = ( version ? Number( version[ 1 ] ) : null );
	}

	window.bender = window.bender || {};
	bender.env = env;
} )();
