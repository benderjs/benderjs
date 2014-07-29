var bl = require( 'browser-launcher' ),
	logger = require( './logger' ).create( 'launcher', true );

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

					var opts = {
						browser: browser
					};

					launcher( bender.conf.address + '/capture', opts, function( err, proc ) {
						if ( err ) {
							logger.error( String( err ) );
						}

						bender.on( 'queues:beforeComplete', function() {
							proc.kill();
						} );
					} );
				} );
			}
		};
	}
};
