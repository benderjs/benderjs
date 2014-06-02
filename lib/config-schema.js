'use strict';

/**
 * @file JSON Schema for the configuration file - used for configuration validation
 * See documentation: {@link http://json-schema.org/documentation.html}
 */
var schema = {
	type: 'object',
	properties: {
		'assertion': {
			title: 'Default assertion',
			description: 'Default assertion library used for the tests',

			type: 'string',
			minLength: 1
		},

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

		'browsers': {
			title: 'Browser list',
			description: 'List of default browsers used for testing',

			type: 'array',
			items: {
				type: 'string',
				minLength: 1
			},
			default: [
				'PhantomJS', 'IE8', 'IE9', 'IE10', 'IE11',
				'Firefox', 'Safari', 'Chrome', 'Opera'
			],
			minItems: 1
		},

		'testRetries': {
			title: 'Test retries',
			description: 'Number of retries to perform before marking a test as failed',

			type: 'number',
			minimum: 0,
			default: 3
		},

		'testTimeout': {
			title: 'Test timeout',
			description: 'Timeout after which a test will be fetched again',

			type: 'number',
			minimum: 1000,
			default: 60 * 1000 // 1 minute
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
					'assertion': {
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
		}
	},
	required: [ 'plugins', 'tests' ]
};

module.exports = schema;
