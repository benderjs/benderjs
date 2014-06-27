/**
 * @file Mockup to be used in tests
 */

'use strict';

var moduleMocks,
	when = require( 'when' ),
	chai = require( 'chai' ),
	util = require( 'util' ),
	EventEmitter = require( 'events' ).EventEmitter,
	chaiAsPromised = require( 'chai-as-promised' );

chai.use( chaiAsPromised );

function nop() {}

moduleMocks = {
	applications: function( bender ) {
		bender.applications = {
			test: {
				url: 'test/',
				path: 'test/fixtures/apps/',
				files: [
					'test.js',
					'test.css'
				],
				js: [
					'test.js'
				],
				css: [
					'test.css'
				]
			},

			test2: {
				url: 'test2/',
				proxy: 'http://localhost/',
				files: [
					'test.js',
					'unknown'
				],
				js: [
					'test.js'
				],
				css: []
			}
		};
	},

	assertions: function( bender ) {
		bender.assertions = {
			test: {

			}
		};
	},

	conf: function( bender ) {
		bender.conf = {
			applications: {
				test: {
					url: 'test/',
					path: 'test/fixtures/apps/',
					files: [
						'test.js',
						'test.css'
					]
				},

				test2: {
					url: 'test2/',
					proxy: 'http://localhost/',
					files: [
						'test.js',
						'unknown'
					]
				}
			},

			assertion: 'test',

			browsers: [ 'Chrome', 'Firefox', 'Opera' ],

			tests: {
				'Test': {
					basePath: 'test/fixtures/tests/',
					paths: [
						'test/',
						'!_assets/'
					]
				},
				'Test2': {
					applications: [ 'test' ],
					basePath: 'test/fixtures/tests/',
					paths: [
						'test2/',
						'!_assets/'
					]
				}
			}
		};
	},

	jobs: function( bender ) {
		bender.jobs = {};

		bender.jobs.getApp = function( jobId, name ) {
			return when.resolve( bender.applications.get( name ) );
		};
	},

	middleware: function( bender ) {
		function testMiddleware() {
			return function( req, res, next ) {
				if ( req.url === '/test' ) {
					res.writeHead( 200 );
					res.end( 'Test response' );
				} else {
					next();
				}
			};
		}

		bender.middleware = [ testMiddleware ];
	},

	pagebuilders: function( bender ) {
		function testPagebuilder( data ) {
			data.parts.push( '<!DOCTYPE html><html><head></head><body>' +
				'<img src="%BASE_PATH%_assets/img.jpg" /></body></html>' );

			return when.resolve( data );
		}

		bender.pagebuilders = [ testPagebuilder ];
	},

	plugins: function( bender ) {
		bender.plugins = {};
		bender.assertions = {
			test: {
				css: [],
				files: [],
				js: [ 'assertion-test/adapter.js' ],
				name: 'test'
			}
		};
		bender.pagebuilders = bender.pagebuilders || [];
		bender.testbuilders = bender.testbuilders || [];
		bender.reporters = {};
	},

	sockets: function( bender ) {
		bender.sockets = {
			attach: nop
		};
	},

	testbuilders: function( bender ) {
		function testBuilder( data ) {
			data.files.forEach( function( file ) {
				var id = file.split( '.' )[ 0 ];

				data.tests[ id ] = {
					id: id,
					js: file
				};
			} );

			return when.resolve( data );
		}

		bender.testbuilders = [ testBuilder ];
	},

	tests: function( bender ) {
		var tests = [ {
			id: 'tests/test/1',
			js: 'tests/test/1.js',
			tags: [ 'foo', 'bar', 'baz' ],
			assertion: 'yui',
			applications: [ 'test', 'test2' ],
			group: 'Test'
		}, {
			id: 'tests/test/2',
			js: 'tests/test/2.js',
			tags: [ 'foo', 'bar', 'baz' ],
			assertion: 'yui',
			applications: [ 'test' ],
			group: 'Test'
		}, {
			id: 'tests/test/3',
			js: 'tests/test/3.js',
			tags: [ 'foo', 'bar', 'baz' ],
			assertion: 'yui',
			applications: [ 'test' ],
			group: 'Test'
		} ];

		bender.tests = {
			tests: tests
		};

		bender.tests.list = function() {
			return when.resolve( tests );
		};
	},

	utils: function( bender ) {
		bender.checkDeps = nop;

		bender.utils = {
			mkdirp: function( path, callback ) {
				callback();
			}
		};
	}
};

function App() {
	EventEmitter.call( this );
	this._modules = {};
}

util.inherits( App, EventEmitter );

App.prototype.use = function( modules, options ) {
	// array of modules added
	if ( Array.isArray( modules ) ) {
		modules.forEach( function( module ) {
			this[ module.name ] = module;

			this._modules[ module.name ] = module;

			if ( typeof module.attach == 'function' ) {
				module.attach.call( this );
			}
		}, this );
	}

	// single module added
	if ( typeof modules === 'object' && modules !== null ) {
		this[ modules.name ] = modules;

		this._modules[ modules.name ] = modules;

		if ( typeof modules.attach == 'function' ) {
			modules.attach.call( this, options );
		}

		return;
	}
};

App.prototype.init = function( callback ) {
	// initialize modules
	Object.keys( this._modules ).forEach( function( name ) {
		var module = this._modules[ name ];

		if ( typeof module == 'object' && module !== null &&
			typeof module.init == 'function' && !module.initialized ) {
			module.init.call( this, nop );
		}
	}, this );

	if ( typeof callback == 'function' ) {
		callback();
	}
};

function getBender( mocks ) {
	var bender = new App();

	if ( mocks ) {
		mocks = Array.prototype.slice.call( arguments, 0 );
		mocks.forEach( function( name ) {
			moduleMocks[ name ]( bender );
		} );
	}

	return bender;
}

module.exports.getBender = getBender;

module.exports.logger = {
	error: nop,
	info: nop,
	debug: nop
};

module.exports.attachPagebuilder = function( bender, builder ) {
	return function() {
		var html = bender.plugins[ 'bender-pagebuilder-html' ],
			idx;

		// add plugin before pagebuilder-html
		if ( html && ( idx = bender.pagebuilders.indexOf( html.build ) ) > -1 ) {
			bender.pagebuilders.splice( idx, 0, builder.build );
		} else {
			bender.pagebuilders.push( builder.build );
		}
	};
};
