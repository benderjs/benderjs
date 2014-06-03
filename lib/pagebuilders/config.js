'use strict';

/**
 * @file Page builder responsible for passing Bender configuration in test page
 */

module.exports = {
	name: 'bender-pagebuilder-config',

	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'pagebuilders' );

		function build( data ) {
			var head = [];

			head.push(
				'<head><script>',
				'(function () {',
				'bender.config = ' + JSON.stringify( bender.conf ) + ';',
				'})();</script></head>'
			);

			data.parts.push( head.join( '\n' ) );

			return data;
		}

		module.exports.build = build;
		bender.pagebuilders.push( build );
	}
};
