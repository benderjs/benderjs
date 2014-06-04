/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for passing Bender configuration to test page
 */

'use strict';

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
