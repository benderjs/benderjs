/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Alerts module
 */

/*global App */

/* bender-include: %BASE_PATH%_mocks.js, %APPS_DIR%bender/js/common.js */

describe( 'Common', function() {
	describe( 'templateHelpers', function() {
		var th = App.Common.templateHelpers;

		describe( 'getTime', function() {
			it( 'should produce a human readable string from a timestamp', function() {
				var timestamp = Date.now() - 5000;

				var result = th.getTime( timestamp );

				expect( result ).to.match( /few seconds ago/ );
			} );
		} );

		describe( 'getResultClass', function() {
			it( 'should produce a proper set of classes', function() {
				expect( th.getResultClass( {
					status: 1
				} ) ).to.equal( 'info bg-info text-info' );

				expect( th.getResultClass( {
					status: 2
				} ) ).to.equal( 'success bg-success text-success' );

				expect( th.getResultClass( {
					status: 3
				} ) ).to.equal( 'danger bg-danger text-danger' );

				expect( th.getResultClass( {
					status: 4
				} ) ).to.equal( 'warning bg-warning text-warning' );
			} );

			it( 'shouldn\'t include background style if noBackground flag', function() {
				expect( th.getResultClass( {
					status: 1
				}, true ) ).to.equal( 'info text-info' );

				expect( th.getResultClass( {
					status: 2
				}, true ) ).to.equal( 'success text-success' );

				expect( th.getResultClass( {
					status: 3
				}, true ) ).to.equal( 'danger text-danger' );

				expect( th.getResultClass( {
					status: 4
				}, true ) ).to.equal( 'warning text-warning' );
			} );
		} );

		describe( 'getResultMessage', function() {
			it( 'should produce a test result message', function() {
				var expected = [
					/Waiting\.\.\./,
					/Pending\.\.\./,
					/Passed in (.+)ms/,
					/Failed in (.+)ms/,
					/Ignored/,
					/Unknown/,
				];

				expected.forEach( function( message, i ) {
					expect( th.getResultMessage( {
						status: i,
						duration: 123
					} ) ).to.match( message );
				} );

				expect( th.getResultMessage( {
					status: 2
				} ) ).to.equal( 'Passed in ?ms' );
			} );
		} );

		describe( 'getResultIcon', function() {
			it( 'should produce a class for a test status icon', function() {
				var expected = [
					'glyphicon-time',
					'glyphicon-refresh',
					'glyphicon-ok',
					'glyphicon-remove',
					'glyphicon-forward'
				];

				expected.forEach( function( className, i ) {
					expect( th.getResultIcon( {
						status: i
					} ) ).to.equal( className );
				} );
			} );
		} );

		describe( 'timeToText', function() {
			it( 'should convert a timestamp to a human readable form', function() {
				expect( th.timeToText( 0 ) ).to.equal( '000ms' );
				expect( th.timeToText( 999 ) ).to.equal( '999ms' );
				expect( th.timeToText( 1000 ) ).to.equal( '01s 000ms' );
				expect( th.timeToText( 59 * 1000 + 999 ) ).to.equal( '59s 999ms' );
				expect( th.timeToText( 60 * 1000 ) ).to.equal( '01m 00s 000ms' );
				expect( th.timeToText( 59 * 60 * 1000 + 59 * 1000 + 999 ) ).to.equal( '59m 59s 999ms' );
				expect( th.timeToText( 60 * 60 * 1000 ) ).to.equal( '1h 00m 00s 000ms' );
				expect(
					th.timeToText( 999 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000 + 999 )
				).to.equal( '999h 59m 59s 999ms' );
			} );
		} );
	} );
} );
