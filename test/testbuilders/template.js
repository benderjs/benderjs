/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Template test builder
 */

/*global describe, it, before, after */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( '../fixtures/_mocks' ),
	path = require( 'path' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	template = rewire( '../../lib/testbuilders/template' ),
	sepPattern = /\//g;


function translatePaths( data ) {
	if ( typeof data == 'string' ) {
		return data.replace( sepPattern, path.sep );
	} else if ( Array.isArray( data ) ) {
		return data.map( function( value ) {
			return translatePaths( value );
		} );
	} else if ( data && typeof data == 'object' ) {
		var resp = {};

		Object.keys( data ).forEach( function( name ) {
			resp[ name ] = translatePaths( data[ name ] );
		} );

		return resp;
	}

	return data;
}

describe( 'Test Builders - Template', function() {
	var sampleData = {
			files: [
				'test/fixtures/tests/test2/__template__.html',
			],
			tests: {
				'test/fixtures/tests/test/1': {
					id: 'test/fixtures/tests/test/1',
					js: 'test/fixtures/tests/test/1.js',
					html: 'test/fixtures/tests/test/1.html'
				},
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js'
				},
				'test/fixtures/tests/test2/3': {
					id: 'test/fixtures/tests/test2/3',
					js: 'test/fixtures/tests/test2/3.js'
				}
			}
		},
		sampleData2 = {
			files: [
				'test/fixtures/tests/test2/__template__.html',
			],
			tests: {
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/1.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js'
				},
				'test/fixtures/tests/test2/3': {
					id: 'test/fixtures/tests/test2/3',
					js: 'test/fixtures/tests/test2/3.js'
				}
			}
		},
		sampleData3 = {
			files: [
				'test/fixtures/tests/test2/__template__.js',
			],
			tests: {
				'test/fixtures/tests/1': {
					id: 'test/fixtures/tests/1',
					html: 'test/fixtures/tests/1.html'
				},
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/1.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					include: [ '%BASE_PATH%foo.js' ]
				}
			}
		},
		sampleData4 = {
			files: [
				'test/fixtures/tests/test2/__template__.js',
			],
			tests: {
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					html: 'test/fixtures/tests/test2/1.html',
					manual: true,
					script: 'test/fixtures/tests/test2/1.md'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					manual: true,
					script: 'test/fixtures/tests/test2/2.md'
				}
			}
		},
		oldAttach,
		bender;

	if ( path.sep === '\\' ) {
		sampleData = translatePaths( sampleData );
		sampleData2 = translatePaths( sampleData2 );
		sampleData3 = translatePaths( sampleData3 );
		sampleData4 = translatePaths( sampleData4 );
	}

	before( function() {
		oldAttach = template.attach;
		bender = mocks.getBender( 'applications', 'plugins', 'utils', 'conf' );
		template.attach = oldAttach || mocks.attachPagebuilder( bender, template );
		bender.use( template );
	} );

	after( function() {
		template.attach = oldAttach;
	} );

	it( 'should expose build function', function() {
		expect( template.build ).to.be.a( 'function' );
	} );

	it( 'should add __template__.html as test\'s html if available', function() {
		var expected = {
				'test/fixtures/tests/test/1': {
					id: 'test/fixtures/tests/test/1',
					js: 'test/fixtures/tests/test/1.js',
					html: 'test/fixtures/tests/test/1.html'
				},
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/__template__.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					html: 'test/fixtures/tests/test2/__template__.html'
				},
				'test/fixtures/tests/test2/3': {
					id: 'test/fixtures/tests/test2/3',
					js: 'test/fixtures/tests/test2/3.js',
					html: 'test/fixtures/tests/test2/__template__.html'
				}
			},
			result = template.build( sampleData );

		if ( path.sep === '\\' ) {
			expected = translatePaths( expected );
		}

		expect( result.tests ).to.deep.equal( expected );
	} );

	it( 'should not override existing test\'s html with __template__.html', function() {
		var expected = {
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/1.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					html: 'test/fixtures/tests/test2/__template__.html'
				},
				'test/fixtures/tests/test2/3': {
					id: 'test/fixtures/tests/test2/3',
					js: 'test/fixtures/tests/test2/3.js',
					html: 'test/fixtures/tests/test2/__template__.html'
				}
			},
			result = template.build( sampleData2 );

		if ( path.sep === '\\' ) {
			expected = translatePaths( expected );
		}

		expect( result.tests ).to.deep.equal( expected );
	} );

	it( 'should ignore __template__.js file for automatic tests', function() {
		var expected = {
				'test/fixtures/tests/1': {
					id: 'test/fixtures/tests/1',
					html: 'test/fixtures/tests/1.html'
				},
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					js: 'test/fixtures/tests/test2/1.js',
					html: 'test/fixtures/tests/test2/1.html'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					include: [ '%BASE_PATH%foo.js' ]
				}
			},
			result = template.build( sampleData3 );

		if ( path.sep === '\\' ) {
			expected = translatePaths( expected );
		}

		expect( result.tests ).to.deep.equal( expected );
	} );

	it( 'should include __template__.js file if found in the same directory level', function() {
		var expected = {
				'test/fixtures/tests/test2/1': {
					id: 'test/fixtures/tests/test2/1',
					html: 'test/fixtures/tests/test2/1.html',
					manual: true,
					script: 'test/fixtures/tests/test2/1.md',
					template: 'test/fixtures/tests/test2/__template__.js'
				},
				'test/fixtures/tests/test2/2': {
					id: 'test/fixtures/tests/test2/2',
					js: 'test/fixtures/tests/test2/2.js',
					manual: true,
					script: 'test/fixtures/tests/test2/2.md'
				}
			},
			result = template.build( sampleData4 );

		if ( path.sep === '\\' ) {
			expected = translatePaths( expected );
		}

		expect( result.tests ).to.deep.equal( expected );
	} );
} );
