/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Page builder responsible for serving test data
 */

'use strict';

var path = require( 'path' ),
	_ = require( 'lodash' );

module.exports = {
	name: 'bender-pagebuilder-testdata',
	build: function( data ) {
		var ignore = [ '_id', 'framework', 'applications', 'parts' ],
			group = this.conf.tests[ data.group ],
			parentDir = data.jobId ? ( '/jobs/' + data.jobId + '/tests/' ) : '/',
			basePath = path.join( parentDir, group.basePath ).replace( /[\\]+/g, '/' ),
			testDir = path.join( parentDir, path.dirname( data.id ), '/' ).replace( /[\\]+/g, '/' );

		data.parts.push( [
			'<head>', '<script>', '(function () {',
			'bender.testData = ' + JSON.stringify( _.omit( data, ignore ) ) + ';',
			'bender.basePath = "' + basePath + '";',
			'bender.testDir = "' + testDir + '";',
			'})();', '</script>', '</head>'
		].join( '\n' ) );

		return data;
	}
};
