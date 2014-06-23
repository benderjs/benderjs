/**
 * @file Mockup to be used in tests
 */

var moduleMocks = {
	config: {}
};

function nop() {}

function App() {}

App.prototype.use = function( modules, options ) {
	// single module added
	if ( typeof modules === 'object' && modules !== null ) {
		this[ module.name ] = module;

		if ( typeof module.attach == 'function' ) {
			module.attach.call( this, options );
		}

		return;
	}

	// array of modules added
	if ( Array.isArray( modules ) ) {
		modules.forEach( function( module ) {
			this[ module.name ] = module;

			if ( typeof module.attach == 'function' ) {
				module.attach.call( this );
			}
		}, this );
	}
};

App.prototype.init = function( callback ) {
	// initialize modules
	Object.keys( this ).forEach( function( name ) {
		if ( typeof this[ name ] == 'object' && this[ name ] !== null &&
			typeof this[ name ].init == 'function' && !this[ name ].initialized ) {
			this[ name ].init( nop );
		}
	} );

	if ( typeof callback == 'function' ) {
		callback();
	}
};

function getBender( mocks ) {
	var bender = new App();

	if ( mocks ) {
		mocks.forEach( function( name ) {
			bender[ name ] = moduleMocks[ name ];
		} );
	}

	return bender;
}

module.exports.getBender = getBender;
