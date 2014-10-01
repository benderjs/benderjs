/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Mockup to be used in tests
 */

'use strict';

var moduleMocks,
	when = require( 'when' ),
	chai = require( 'chai' ),
	util = require( 'util' ),
	path = require( 'path' ),
	fs = require( 'fs' ),
	_ = require( 'lodash' ),
	EventEmitter = require( 'eventemitter2' ).EventEmitter2,
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

		bender.applications.get = function( name ) {
			return bender.applications[ name ] || null;
		};
	},

	frameworks: function( bender ) {
		bender.frameworks = {
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
					proxy: 'http://localhost:1032/',
					files: [
						'test.js',
						'unknown'
					]
				},

				test3: {
					url: 'test3/',
					path: 'test/fixtures/apps/',
					files: [
						'test.js',
						'test.css'
					]
				},
			},

			framework: 'test',

			basePaths: [ 'test/fixtures/tests/' ],

			browsers: [ 'chrome', 'firefox', 'opera', 'ie11' ],

			manualBrowsers: [ 'chrome', 'firefox', 'opera', 'ie11' ],

			manualTestTimeout: 60000,

			tests: {
				'Test': {
					basePath: 'test/fixtures/tests/',
					paths: [
						'test/**',
						'!**/_assets/**'
					],
					regressions: {
						'test/fixtures/tests/test/1': 'condition'
					}
				},
				'Test2': {
					applications: [ 'test' ],
					basePath: 'test/fixtures/tests/',
					paths: [
						'test2/**',
						'!**/_assets/**'
					]
				}
			},

			testRetries: 3,
			testTimeout: 30000
		};
	},

	files: function( bender ) {
		bender.files = {};
	},

	jobs: function( bender ) {
		var jobs = [ {
				browsers: [ 'chrome' ],
				description: 'test job 1',
				created: 1403699939665,
				snapshot: true,
				filter: [ 'foo' ],
				_id: 'AYIlcxZa1i1nhLox'
			}, {
				browsers: [ 'firefox', ],
				description: 'test job 2',
				created: 1403699939665,
				filter: [ 'foo' ],
				_id: 'ECNtxgcMzm94aQc9'
			} ],

			tasks = [ {
				id: 'test/fixtures/tests/test/1',
				_id: 'ECNtxgcMzm94aQc9',
				jobId: 'AYIlcxZa1i1nhLox',
				results: [ {
					name: 'chrome',
					version: 0,
					jobId: 'AYIlcxZa1i1nhLox',
					status: 0,
					retries: 0
				} ]
			}, {
				id: 'test/fixtures/tests/test/1?foo=bar',
				_id: 'ECNtxgcMzm94aQc8',
				jobId: 'AYIlcxZa1i1nhLox',
				results: [ {
					name: 'chrome',
					version: 0,
					jobId: 'AYIlcxZa1i1nhLox',
					status: 0,
					retries: 0
				} ]
			}, {
				id: 'test/fixtures/tests/test/2',
				_id: 'qxXbaXERyznmKIhz',
				jobId: 'AYIlcxZa1i1nhLox',
				results: [ {
					name: 'chrome',
					version: 0,
					jobId: 'AYIlcxZa1i1nhLox',
					status: 0,
					retries: 0
				} ]
			}, {
				id: 'test/fixtures/tests/test/3',
				_id: 'oTNMAwH5EHFNr3lc',
				jobId: 'AYIlcxZa1i1nhLox',
				results: [ {
					name: 'chrome',
					version: 0,
					jobId: 'AYIlcxZa1i1nhLox',
					status: 0,
					retries: 0
				} ]
			}, {
				id: 'test/fixtures/tests/test/1',
				_id: 'ECNtxgcMzm94aQc9',
				jobId: 'ECNtxgcMzm94aQc9',
				results: [ {
					name: 'firefox',
					version: 0,
					jobId: 'ECNtxgcMzm94aQc9',
					status: 0,
					retries: 0
				} ]
			}, {
				id: 'test/fixtures/tests/test/2',
				_id: 'qxXbaXERyznmKIhz',
				jobId: 'ECNtxgcMzm94aQc9',
				results: [ {
					name: 'firefox',
					version: 0,
					jobId: 'ECNtxgcMzm94aQc9',
					status: 0,
					retries: 0
				} ]
			}, {
				id: 'test/fixtures/tests/test/3',
				_id: 'oTNMAwH5EHFNr3lc',
				jobId: 'ECNtxgcMzm94aQc9',
				results: [ {
					name: 'firefox',
					version: 0,
					jobId: 'ECNtxgcMzm94aQc9',
					status: 0,
					retries: 0
				} ]
			} ];

		bender.jobs = {
			jobs: jobs,

			getApp: function( jobId, name ) {
				return when.resolve( ( name === 'test' || name === 'test2' ) ? bender.applications.get( name ) : null );
			},

			getTask: function( jobId, taskId ) {
				return when.resolve( _.where( tasks, {
					id: taskId,
					jobId: jobId
				} )[ 0 ] );
			},

			get: function( jobId ) {
				var job = _.where( jobs, {
					_id: jobId
				} )[ 0 ];

				if ( job ) {
					job.tasks = _.where( tasks, {
						jobId: jobId
					} );
				}

				return when.resolve( job ? job : null );
			},

			find: function( jobId ) {
				return when.resolve( _.where( jobs, {
					_id: jobId
				} )[ 0 ] );
			},

			list: function() {
				return when.resolve( jobs );
			},

			restart: function( jobId ) {
				var job = _.where( jobs, {
					_id: jobId
				} )[ 0 ];

				return job ?
					when.resolve() :
					when.reject( 'There are no tasks for this job or a job does not exist.' );
			},


			create: function() {
				return when.resolve( 'newJobId' );
			},

			edit: function( id ) {
				var job = bender.jobs.find( id );

				return when.resolve( job );
			},

			delete: function() {
				return when.resolve( 'newJobId' );
			},

			startTask: function( task ) {
				return when.resolve( ( task.results && task.results[ 0 ].retries > 0 ) ? null : task );
			}
		};
	},

	middlewares: function( bender ) {
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

		bender.middlewares = [ testMiddleware ];
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
		bender.plugins = _.extend( {
			_include: {
				css: [ '/plugins/framework-test/test.css' ],
				js: [ '/plugins/framework-test/adapter.js' ]
			},
			getIncludes: function() {
				return bender.plugins._include;
			}
		}, bender.plugins || {} );

		bender.frameworks = {
			test: {
				css: [],
				files: [],
				js: [ 'framework-test/adapter.js' ],
				name: 'test'
			},
			test2: {
				css: [ 'framework-test/test.css' ],
				files: [],
				js: [],
				name: 'test2'
			}
		};
		bender.pagebuilders = bender.pagebuilders || [];
		bender.testbuilders = bender.testbuilders || [];
		bender.preprocessors = bender.preprocessors || [];
		bender.reporters = {};
	},

	sockets: function( bender ) {
		bender.sockets = {
			attach: nop
		};
	},

	template: function( bender ) {
		bender.template = {
			build: function( data ) {
				return when.resolve(
					data.html ? fs.readFileSync( path.resolve( data.html ) ).toString() :
					fs.readFileSync( path.resolve( 'static/default.html' ) ).toString()
				);
			}
		};
	},

	testbuilders: function( bender ) {
		function testBuilder( data ) {
			data.files.forEach( function( file ) {
				var id = file.split( '.' )[ 0 ],
					ext = file.split( '.' )[ 1 ];

				if ( ext !== 'js' && ext !== 'md' ) {
					return;
				}

				var test = {
					id: id
				};

				if ( ext === 'js' ) {
					test.js = file;
				}

				if ( ext === 'md' ) {
					test.script = file;
				}

				data.tests[ id ] = _.merge( {}, test, data.tests[ id ] || {} );
			} );

			return when.resolve( data );
		}

		bender.testbuilders = [ testBuilder ];
	},

	tests: function( bender ) {
		var tests = [ {
			id: 'test/fixtures/tests/test/1',
			js: 'test/fixtures/tests/test/1.js',
			html: 'test/fixtures/tests/test/1.html',
			tags: [ 'foo', 'bar', 'baz' ],
			framework: 'yui',
			applications: [ 'test', 'test2', 'test3' ],
			group: 'Test'
		}, {
			id: 'test/fixtures/tests/test/1?foo=bar',
			js: 'test/fixtures/tests/test/1.js',
			html: 'test/fixtures/tests/test/1.html',
			tags: [ 'foo', 'bar', 'baz' ],
			framework: 'yui',
			applications: [ 'test', 'test2' ],
			group: 'Test'
		}, {
			id: 'test/fixtures/tests/test/2',
			js: 'test/fixtures/tests/test/2.js',
			tags: [ 'foo', 'bar', 'baz' ],
			framework: 'yui',
			applications: [ 'test' ],
			group: 'Test'
		}, {
			id: 'test/fixtures/tests/test/3',
			js: 'test/fixtures/tests/test/3.js',
			tags: [ 'foo', 'bar', 'baz' ],
			framework: 'yui',
			applications: [ 'test' ],
			group: 'Test'
		} ];

		bender.tests = {
			tests: _.cloneDeep( tests )
		};

		bender.tests.list = function() {
			return when.resolve( bender.tests.tests );
		};

		bender.tests.get = function( id ) {
			return when.resolve( _.where( bender.tests.tests, {
				id: id
			} )[ 0 ] );
		};

		bender.tests.checkPath = function( file ) {
			return bender.conf.basePaths.some( function( basePath ) {
				return file.indexOf( basePath ) === 0;
			} );
		};
	},

	utils: function( bender ) {
		bender.checkDeps = nop;

		bender.utils = {
			mkdirp: function( path, callback ) {
				callback();
			},
			stripParams: function( url ) {
				return url;
			}
		};
	}
};

function App() {
	EventEmitter.call( this );
	this._modules = {};
	this.plugins = {};
}

util.inherits( App, EventEmitter );

App.prototype.use = function( modules, options ) {
	// array of modules added
	if ( Array.isArray( modules ) ) {
		modules.forEach( function( module ) {
			this.plugins[ module.name ] = this._modules[ module.name ] = module;

			if ( typeof module.attach == 'function' ) {
				module.attach.call( this, options );
			}
		}, this );
	}

	// single module added
	if ( typeof modules === 'object' && modules !== null ) {
		this.plugins[ modules.name ] = modules;

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
			bender.pagebuilders.splice( idx, 0, builder.build.bind( bender ) );
		} else {
			bender.pagebuilders.push( builder.build.bind( bender ) );
		}
	};
};

module.exports.createFakeRequest = function( headers ) {
	var req = {
		headers: headers || {}
	};

	return req;
};

module.exports.createFakeResponse = function( callback ) {
	var resp = {
		status: 0,

		headers: {},

		writeHead: function( status, headers ) {
			resp.status = status;
			resp.headers = _.merge( resp.headers, headers );
		},

		setHeader: function( name, value ) {
			resp.headers[ name ] = value;
		},

		end: function( data ) {
			resp.data = data;
			callback( data, resp );
		}
	};

	return resp;
};
