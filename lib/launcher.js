var bl = require( 'browser-launcher' ),
	_ = require( 'lodash' ),
	logger = require( './logger' ).create( 'launcher', true );

function formatAvailable( browsers ) {
	var result = [];

	_.forEach( browsers, function( group, name ) {
		result.push( name + ':' );

		group.forEach( function( browser ) {
			result.push( '- ' + browser.name + ' ' + browser.version );
		} );
	} );

	return result.join( '\n' );
}

module.exports = {
	name: 'bender-launcher',

	attach: function() {
		var bender = this;

		bender.launcher = {
			launch: function( browser ) {
				bl( function( err, launcher ) {
					if ( err ) {
						logger.error( String( err ) );
					}

					// optional configuration for a browser taken from the bender.js configuration file
					var conf = bender.conf.startBrowserOptions && bender.conf.startBrowserOptions[ browser ] || {};

					logger.info( 'Available browsers:\n' + formatAvailable( launcher.browsers ) + '\n' );

					launcher( bender.conf.address + '/capture', _.extend( {
						browser: browser
					}, conf ), function( err, instance ) {
						if ( err ) {
							logger.error( String( err ) );
							process.exit( 1 );
						}

						bender.on( 'queues:beforeComplete', function() {
							instance.stop();
						} );
					} );
				} );
			}
		};
	}
};
