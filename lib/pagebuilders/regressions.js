/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for handling regressions information
 */

'use strict';

function build( data ) {
	data.parts.push( '<head>\n<script>\n(function () {\n' +
		'bender.regressions = bender.config.tests["' + data.group + '"].regressions;\n' +
		'})();\n</script>\n</head>' );

	return data;
}

module.exports = {
	name: 'bender-pagebuilder-regressions',
	build: build
};
