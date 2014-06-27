/**
 * @file Tests for Utils module
 */

/*global describe, it */
/*jshint -W030 */
/* removes annoying warning caused by some of Chai's assertions */

'use strict';

var mocks = require( './mocks' ),
	sinon = require( 'sinon' ),
	expect = require( 'chai' ).expect,
	rewire = require( 'rewire' ),
	fs = require( 'fs' ),
	path = require( 'path' ),
	rimraf = require( 'rimraf' ),
	utils = rewire( '../lib/utils' );

// rewire logger
utils.__set__( 'logger', mocks.logger );

describe( 'Utils', function() {
	var bender = mocks.getBender();

	bender.use( utils );

	it( 'should exit process if dependency is missing', function() {
		var exit = sinon.stub( process, 'exit' );

		exit.throws();

		expect( function() {
			bender.checkDeps( 'test', 'unknown' );
		} ).to.throw();

		expect( function() {
			bender.checkDeps( 'test', 'utils' );
		} ).to.not.throw();

		process.exit.restore();
	} );

	it( 'should render HTML in a response', function() {
		var html = '<html><head></head><body></body></html>',
			res = {
				writeHead: function() {},
				end: function() {}
			},
			mock = sinon.mock( res );

		mock.expects( 'writeHead' ).once().withArgs( 200 );
		mock.expects( 'end' ).once().withArgs( html );

		bender.utils.renderHTML( res, html );

		expect( function() {
			mock.verify();
		} ).to.not.throw();
	} );

	it( 'should render JSON in a response', function() {
		var obj = {
				'foo': true,
				'bar': 'baz'
			},
			res = {
				writeHead: function() {},
				end: function() {}
			},
			mock = sinon.mock( res );

		mock.expects( 'writeHead' ).once().withArgs( 200 );
		mock.expects( 'end' ).once().withArgs( JSON.stringify( obj ) );

		bender.utils.renderJSON( res, obj );

		expect( function() {
			mock.verify();
		} ).to.not.throw();
	} );


	it( 'should render script in a response', function() {
		var script = 'var foo = 1;, bar = 2;',
			res = {
				writeHead: function() {},
				end: function() {}
			},
			mock = sinon.mock( res );

		mock.expects( 'writeHead' ).once().withArgs( 200 );
		mock.expects( 'end' ).once().withArgs( script );

		bender.utils.renderScript( res, script );

		expect( function() {
			mock.verify();
		} ).to.not.throw();
	} );

	it( 'should replace %NAME% tags with given object properties', function() {
		var tpl =
			'<body>%bar%<p>lorem %foo% ipsum foo dolor sit%baz%amet baz</body>',
			obj = {
				foo: 'bar',
				baz: 12345
			},
			output =
			'<body>%bar%<p>lorem bar ipsum foo dolor sit12345amet baz</body>';

		expect( bender.utils.template( tpl, obj ) ).to.equal( output );
	} );

	it( 'should create directory recursively', function( done ) {
		var dir = path.normalize( 'test/fixtures/utils/test/' ),
			callback = function() {
				fs.exists( dir, function( exists ) {
					expect( exists ).to.be.true;

					rimraf( path.normalize( 'test/fixtures/utils/' ), function() {
						done();
					} );
				} );
			};

		bender.utils.mkdirp( dir, callback );
	} );

	it( 'should not try to create existing path', function( done ) {
		var dir = path.normalize( '/' ),
			spy = sinon.spy( bender.utils, 'mkdirp' ),
			callback = function() {
				expect( spy.calledThrice ).to.be.true;
				bender.utils.mkdirp.restore();
				done();
			};

		bender.utils.mkdirp( dir, callback );
	} );

	it( 'should not try to create invalid path', function( done ) {
		var dir = '<^>!@#$%^&*()_+-=\0',
			callback = function( error ) {
				expect( error ).to.exist;
				done();
			};

		bender.utils.mkdirp( dir, callback );
	} );

} );
