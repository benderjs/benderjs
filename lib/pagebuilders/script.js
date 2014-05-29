"use strict";

/**
 * @file Page builder responsible for tests script
 */

var readFile = require( 'when/node' ).lift( require( 'fs' ).readFile );

function build( data ) {
	if ( !data.js ) {
		return data;
	}

	data.parts.push( readFile( data.js ).then( function( script ) {
		return '<script>\n(function (bender) {\n' + script +
			'\n})(window.bender || {});\n</script>';
	} ) );

	return data;
}

module.exports = {
	name: 'bender-pagebuilder-script',
	build: build,
	attach: function() {
		this.pagebuilders.push( build );
	}
};
