/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file JSON Schema for the configuration file - used for configuration validation
 * See documentation: {@link http://json-schema.org/documentation.html}
 */

'use strict';

var schema = {
	type: 'object',
	properties: {
		'applications': {
			title: 'Project\'s aplications',
			description: 'Applications used in current project',

			type: 'object',
			additionalProperties: {
				type: 'object',
				properties: {
					'path': {
						type: 'string',
						minLength: 1
					},
					'proxy': {
						type: 'string',
						minLength: 1
					},
					'url': {
						type: 'string',
						minLength: 1
					},
					'files': {
						type: 'array',
						items: {
							type: 'string',
							minLength: 1
						},
						minItems: 1
					}
				},
				required: [ 'files' ],
				anyOf: [ {
					required: [ 'path' ]
				}, {
					required: [ 'proxy' ]
				} ]
			}
		},

		'browsers': {
			title: 'Browser list',
			description: 'List of browsers used for testing',

			type: 'array',
			items: {
				type: 'string',
				minLength: 1
			},
			default: [
				'ie8', 'ie9', 'ie10', 'ie11', 'firefox', 'safari', 'chrome', 'opera'
			],
			minItems: 1
		},

		'captureTimeout': {
			title: 'Browser capture timeout',
			description: 'Timeout before which a launched browser should connect to the server',

			type: 'number',
			default: 10000
		},

		'framework': {
			title: 'Default framework',
			description: 'Default framework used for the tests',

			type: 'string',
			minLength: 1
		},

		'hostname': {
			title: 'Server hostname',
			description: 'Host on which the HTTP and WebSockets servers will listen',

			type: 'string',
			minLength: 1
		},

		'plugins': {
			title: 'Plugins list',
			description: 'List of Bender plugins to load at startup',

			type: 'array',
			items: {
				type: 'string',
				minLength: 1
			},
			minItems: 1
		},

		'port': {
			title: 'Server port',
			description: 'Port on which the HTTP and WebSockets servers will listen',

			type: 'number',
			minimum: 1,
			maximum: 65536
		},

		'slowAvgThreshold': {
			title: 'Slow test average threshold',
			description: 'Average test case duration threshold above which a test is marked as slow',
			type: 'number',
			minimum: 0,
			default: 200 // 200 milliseconds
		},

		'slowThreshold': {
			title: 'Slow test threshold',
			description: 'Test duration threshold above which a test is marked as slow',
			type: 'number',
			minimum: 0,
			default: 30 * 1000 // 30 seconds
		},

		'startBrowser': {
			title: 'Started browser',
			description: 'Name of a browser to start when executing bender run command',
			type: 'string',
			minLength: 1,
			default: 'phantomjs'
		},

		'testRetries': {
			title: 'Test retries',
			description: 'Number of retries to perform before marking a test as failed',

			type: 'number',
			minimum: 0,
			default: 3
		},

		'tests': {
			title: 'Test groups',
			description: 'Test groups for the project',

			type: 'object',
			minProperties: 1,
			additionalProperties: {
				type: 'object',
				properties: {
					'applications': {
						type: 'array',
						items: {
							type: 'string',
							minLength: 1
						}
					},
					'framework': {
						type: 'string',
						minLength: 1
					},
					'basePath': {
						type: 'string',
						minLength: 1
					},
					'paths': {
						type: 'array',
						items: {
							type: 'string',
							minLength: 1
						},
						minItems: 1
					}
				},
				required: [ 'basePath', 'paths' ]
			}
		},

		'testTimeout': {
			title: 'Test timeout',
			description: 'Timeout after which a test will be fetched again',

			type: 'number',
			minimum: 1000,
			default: 60 * 1000 // 1 minute
		}
	},
	required: [ 'plugins', 'tests' ]
};

module.exports = schema;
