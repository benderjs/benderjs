/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for serving regression information
 */

'use strict';

module.exports = {
	name: 'bender-pagebuilder-regressions',
	attach: function() {
		var bender = this;

		function build( data ) {
			var regressions = bender.conf.tests[ data.group ].regressions;

			if ( !regressions ) {
				return data;
			}

			data.parts.push( '<head>\n<script>\n(function () {\n' +
				'bender.regressions = ' + JSON.stringify( regressions ) + ';\n' +
				'})();\n</script>\n</head>' );

			return data;
		}

		module.exports.build = build;
		bender.pagebuilders.push( build );
	}
};
