var bl = require( 'browser-launcher2' ),
	_ = require( 'lodash' ),
	logger = require( './logger' ).create( 'launcher', true );

module.exports = {
	name: 'bender-launcher',

	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'browsers' );

		bender.launcher = {
			list: function() {
				bl( function( err, launcher ) {
					logger.info( 'Available browsers:\n' + launcher.browsers.map( function( browser ) {
						return '- ' + browser.name + ' ' + browser.version;
					} ).join( '\n' ) + '\n' );
				} );
			},

			launch: function( browser, callback ) {
				bl( function( err, launcher ) {
					if ( err ) {
						logger.error( err );
						bender.emit( 'browser:stopped' );
					}

					// optional configuration for a browser taken from the bender.js configuration file
					var conf = bender.conf.startBrowserOptions && bender.conf.startBrowserOptions[ browser ] || {};

					browser = bender.browsers.parseBrowser( browser );

					launcher( bender.conf.address + '/capture', _.extend( {
						browser: browser.name + ( browser.version !== 0 ? '/' + browser.version : '' )
					}, conf ), function( err, instance ) {
						var captureTimeout;

						if ( err ) {
							logger.error( err );
							process.exit( 1 );
						}

						function startCaptureTimeout() {
							captureTimeout = setTimeout( function() {
								logger.error( 'Client capture timeout' );
								instance.stop();
							}, bender.conf.captureTimeout );
						}

						startCaptureTimeout();

						bender.on( 'client:afterRegister', function( client ) {
							if ( client.browser === browser.name &&
								( !browser.version || client.version === browser.version ) ) {
								clearTimeout( captureTimeout );
							}
						} );

						bender.on( 'client:disconnect', function( client ) {
							if ( client.browser === browser.name &&
								( !browser.version || client.version === browser.version ) &&
								!bender.browsers.clients.find( 'browser', client.browser ).length ) {
								startCaptureTimeout();
							}
						} );

						if ( typeof callback == 'function' ) {
							callback( instance );
						}
					} );
				} );
			}
		};
	}
};
