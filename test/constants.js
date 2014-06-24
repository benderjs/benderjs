/**
 * @file Tests for Constangs module
 */

/*global describe, it */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './mocks' ),
	expect = require( 'chai' ).expect,
	constants = require( '../lib/constants' );

describe( 'Constants', function() {
	var bender = mocks.getBender(),
		pattern = /[A-Z_\-0-9]+/g;

	bender.use( constants );

	it( 'should be passed to bender', function() {
		var keys = Object.keys( constants ).filter( function( key ) {
			return pattern.test( key );
		} );

		expect( bender ).to.contain.keys( keys );
	} );
} );
