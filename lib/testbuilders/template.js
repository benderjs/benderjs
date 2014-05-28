/**
 * Adds template.html as test's HTML source if no html file specified
 */

var path = require( 'path' ),
	builder;

/**
 * Default test build for given group
 * @param  {Object} data Group object
 * @return {Object}
 */
function build( data ) {
	Object.keys( data.tests ).forEach( function( id ) {
		var test = data.tests[ id ],
			tpl;

		if ( test.html ) {
			return;
		}

		tpl = path.dirname( id ) + '/template.html';

		if ( data.files.indexOf( tpl ) > -1 ) {
			test.html = tpl;
		}
	} );

	return data;
}

module.exports = builder = {

	name: 'bender-testbuilder-template',
	build: build,

	attach: function() {
		var bender = this;

		bender.checkDeps( builder.name, 'testbuilders' );

		bender.testbuilders.push( builder.build );
	}
};
