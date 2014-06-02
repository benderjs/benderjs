'use strict';

/**
 * @file Page builder responsible for application resources
 */

function build( data ) {
	var head = [ '<head>' ];

	if ( !data.applications ) {
		return data;
	}

	data.applications.forEach( function( app ) {
		app.css.forEach( function( css ) {
			head.push( '<link rel="stylesheet" href="' + css + '">' );
		} );
		app.js.forEach( function( js ) {
			head.push( '<script src="' + js + '"></script>' );
		} );
	} );

	head.push( '</head>' );

	data.parts.push( head.join( '' ) );

	return data;
}

module.exports = {
	name: 'bender-pagebuilder-applications',
	build: build
};
