/**
 * @file JSON a schema for the configuration file - used for configuration validation
 */
var schema = {
    type: 'object',
    properties: {
        'assertion': {
            type: 'string'
        },

        'applications': {
            type: 'object',
            additionalProperties: {
                type: 'object',
                properties: {
                    'path': {
                        type: 'string'
                    },
                    'proxy': {
                        type: 'string'
                    },
                    'url': {
                        type: 'string',
                    },
                    'files': {
                        type: 'array',
                        items: {
                            type: 'string'
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
                type: 'string'
            },
            minItems: 1
        },

        'browsers': {
            type: 'array',
            items: {
                type: 'string'
            },
            default: [
                'PhantomJS', 'IE8', 'IE9', 'IE10', 'IE11',
                'Firefox', 'Safari', 'Chrome', 'Opera'
            ],
            minItems: 1
        },

        'testTimeout': {
            type: 'number',
            default: 5 * 60 * 1000 // 5 minutes
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
                            type: 'string'
                        }
                    },
                    'assertion': {
                        type: 'string'
                    },
                    'basePath': {
                        type: 'string',
                    },
                    'paths': {
                        type: 'array',
                        items: {
                            type: 'string'
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
