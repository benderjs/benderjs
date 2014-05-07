/**
 * @file JSON Schema for the configuration file - used for configuration validation
 * See documentation: {@link http://json-schema.org/documentation.html}
 */
var schema = {
    type: 'object',
    properties: {
        'assertion': {
            type: 'string',
            minLength: 1
        },

        'applications': {
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
                required: ['files'],
                anyOf: [
                    { required: ['path'] },
                    { required: ['proxy'] }
                ]
            }
        },

        'plugins': {
            type: 'array',
            items: {
                type: 'string',
                minLength: 1
            },
            minItems: 1
        },

        'browsers': {
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

        'testTimeout': {
            type: 'number',
            minimum: 1000,
            default: 60 * 1000 // 1 minute
        },

        'tests': {
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
                required: ['basePath', 'paths']
            }
        }
    },
    required: ['plugins', 'tests']
};

module.exports = schema;
