/**
 * @file Mockup to be used in tests
 */

'use strict';

var moduleMocks;

function nop() {}

moduleMocks = {
	conf: function( bender ) {
		bender.conf = {
			applications: {
				test: {
					path: 'test/fixtures/apps/',
					files: [
						'test.js',
						'test.css'
					]
				},

				test2: {
					proxy: 'http://localhost/',
					files: [
						'test.js',
						'unknown'
					]
				}
			},

			browsers: [ 'Chrome', 'Firefox', 'Opera' ]
		};
	},

	utils: function( bender ) {
		bender.checkDeps = nop;

		bender.utils = {};
	}
};

function App() {
	this._modules = {};
	this._handlers = {};
}

App.prototype.emit = function( name, args ) {
	if ( typeof this._handlers[ name ] == 'function' ) {
		this._handlers[ name ].apply( this, Array.prototype.slice.call( arguments, 1 ) );
	}
};

App.prototype.on = function( name, callback ) {
	this._handlers[ name ] = callback;
};

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
