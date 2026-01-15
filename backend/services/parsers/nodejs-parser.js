/**
 * Node.js Generic Parser
 * Analyzes vanilla Node.js HTTP servers, Fastify, Koa, and other patterns
 */

const {
    generateEndpointExamples,
    generateExampleValue
} = require('./example-generator');

/**
 * Parse Node.js file for API endpoints
 * @param {string} content - File content
 * @param {string} filePath - File path for context
 * @returns {Object} Parsed endpoints and metadata
 */
function parseNodejsFile(content, filePath) {
    const result = {
        endpoints: [],
        serverType: detectServerType(content),
        middleware: [],
        hasAuth: false
    };

    // Detect auth patterns
    const authPatterns = [
        /jwt|jsonwebtoken/i,
        /passport/i,
        /authenticate|isAuthenticated/i,
        /verifyToken|checkAuth/i,
        /authorization.*bearer/i
    ];
    result.hasAuth = authPatterns.some(p => p.test(content));

    // Parse based on detected server type
    switch (result.serverType) {
        case 'fastify':
            parseFastifyRoutes(content, result);
            break;
        case 'koa':
            parseKoaRoutes(content, result);
            break;
        case 'hapi':
            parseHapiRoutes(content, result);
            break;
        case 'http':
        default:
            parseHttpRoutes(content, result);
            break;
    }

    return result;
}

/**
 * Detect the type of Node.js server
 */
function detectServerType(content) {
    if (/require\s*\(\s*['"`]fastify['"`]\)|from\s+['"`]fastify['"`]/i.test(content)) {
        return 'fastify';
    }
    if (/require\s*\(\s*['"`]koa['"`]\)|from\s+['"`]koa['"`]/i.test(content)) {
        return 'koa';
    }
    if (/require\s*\(\s*['"`]@hapi\/hapi['"`]\)|from\s+['"`]@hapi\/hapi['"`]/i.test(content)) {
        return 'hapi';
    }
    if (/require\s*\(\s*['"`]http['"`]\)|from\s+['"`]http['"`]/i.test(content)) {
        return 'http';
    }
    // Check for Express patterns (defer to Express parser)
    if (/require\s*\(\s*['"`]express['"`]\)|from\s+['"`]express['"`]/i.test(content)) {
        return 'express';
    }
    return 'unknown';
}

/**
 * Parse Fastify routes
 */
function parseFastifyRoutes(content, result) {
    // fastify.get('/path', options, handler)
    const routePatterns = [
        /fastify\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /\.route\s*\(\s*\{\s*method:\s*['"`](\w+)['"`]\s*,\s*url:\s*['"`]([^'"`]+)['"`]/gi
    ];

    for (const pattern of routePatterns) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const path = match[2];

            const context = getContext(content, match.index, 800);

            result.endpoints.push({
                method,
                path,
                ...extractFastifyDetails(context, method, path)
            });
        }
    }

    // Fastify schema-based routes
    const schemaRoutes = content.matchAll(/\.route\s*\(\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs);
    for (const match of schemaRoutes) {
        const routeConfig = match[1];
        const methodMatch = routeConfig.match(/method:\s*['"`](\w+)['"`]/i);
        const urlMatch = routeConfig.match(/url:\s*['"`]([^'"`]+)['"`]/i);

        if (methodMatch && urlMatch) {
            const method = methodMatch[1].toUpperCase();
            const path = urlMatch[1];

            // Check if already added
            if (!result.endpoints.find(e => e.method === method && e.path === path)) {
                result.endpoints.push({
                    method,
                    path,
                    ...extractFastifySchemaDetails(routeConfig, method, path)
                });
            }
        }
    }
}

/**
 * Extract details from Fastify route context
 */
function extractFastifyDetails(context, method, path) {
    const details = {
        summary: generateSummary(method, path),
        parameters: extractPathParameters(path),
        requestBody: null,
        responses: [{ code: '200', description: 'Successful response' }],
        requiresAuth: /preValidation|preHandler.*auth|onRequest.*auth/i.test(context)
    };

    // Detect request body from request.body
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const bodyFields = extractBodyFields(context);
        if (bodyFields.length > 0) {
            details.requestBody = createRequestBody(bodyFields);
        }
    }

    // Detect query parameters
    const queryParams = extractQueryParameters(context);
    details.parameters.push(...queryParams);

    return details;
}

/**
 * Extract details from Fastify schema configuration
 */
function extractFastifySchemaDetails(config, method, path) {
    const details = {
        summary: generateSummary(method, path),
        parameters: extractPathParameters(path),
        requestBody: null,
        responses: [{ code: '200', description: 'Successful response' }],
        requiresAuth: false
    };

    // Extract schema.body
    const bodySchemaMatch = config.match(/body:\s*\{([^}]+)\}/s);
    if (bodySchemaMatch) {
        details.requestBody = {
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        description: 'Request body schema (from Fastify schema)'
                    }
                }
            }
        };
    }

    // Extract schema.querystring
    const queryMatch = config.match(/querystring:\s*\{([^}]+)\}/s);
    if (queryMatch) {
        const queryFields = extractSchemaFields(queryMatch[1]);
        for (const field of queryFields) {
            details.parameters.push({
                name: field,
                in: 'query',
                required: false,
                schema: { type: 'string' }
            });
        }
    }

    // Extract response schema
    const responseMatch = config.match(/response:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
    if (responseMatch) {
        const codes = responseMatch[1].match(/(\d{3}):/g) || [];
        details.responses = codes.map(code => ({
            code: code.replace(':', ''),
            description: getStatusDescription(code.replace(':', ''))
        }));
    }

    return details;
}

/**
 * Parse Koa routes (with koa-router)
 */
function parseKoaRoutes(content, result) {
    // router.get('/path', handler)
    const routePattern = /router\.(get|post|put|patch|delete|del)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let match;

    while ((match = routePattern.exec(content)) !== null) {
        const method = match[1] === 'del' ? 'DELETE' : match[1].toUpperCase();
        const path = match[2];

        const context = getContext(content, match.index, 600);

        result.endpoints.push({
            method,
            path,
            ...extractKoaDetails(context, method, path)
        });
    }
}

/**
 * Extract details from Koa route context
 */
function extractKoaDetails(context, method, path) {
    const details = {
        summary: generateSummary(method, path),
        parameters: extractPathParameters(path),
        requestBody: null,
        responses: [{ code: '200', description: 'Successful response' }],
        requiresAuth: /auth|isAuthenticated|requireLogin/i.test(context)
    };

    // Detect ctx.request.body usage
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const bodyMatch = context.match(/(?:ctx\.request\.body|ctx\.body)\s*[;,\n]|(?:const|let)\s*\{([^}]+)\}\s*=\s*ctx\.request\.body/);
        if (bodyMatch) {
            const fields = bodyMatch[1] ? bodyMatch[1].split(',').map(f => f.trim()) : [];
            if (fields.length > 0) {
                details.requestBody = createRequestBody(fields);
            } else {
                details.requestBody = {
                    content: {
                        'application/json': {
                            schema: { type: 'object' }
                        }
                    }
                };
            }
        }
    }

    // Detect query parameters from ctx.query
    const queryMatches = context.matchAll(/ctx\.query\.(\w+)|ctx\.query\[['"`](\w+)['"`]\]/g);
    for (const qm of queryMatches) {
        const paramName = qm[1] || qm[2];
        if (!details.parameters.find(p => p.name === paramName)) {
            details.parameters.push({
                name: paramName,
                in: 'query',
                required: false,
                schema: { type: 'string' }
            });
        }
    }

    // Detect response status
    const statusMatch = context.match(/ctx\.status\s*=\s*(\d+)/);
    if (statusMatch) {
        const code = statusMatch[1];
        if (!details.responses.find(r => r.code === code)) {
            details.responses.push({
                code,
                description: getStatusDescription(code)
            });
        }
    }

    return details;
}

/**
 * Parse Hapi routes
 */
function parseHapiRoutes(content, result) {
    // server.route({ method, path, handler })
    const routePattern = /\.route\s*\(\s*\{\s*method:\s*['"`](\w+)['"`]\s*,\s*path:\s*['"`]([^'"`]+)['"`]/gi;
    let match;

    while ((match = routePattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const path = match[2];

        result.endpoints.push({
            method,
            path: path.replace(/\{(\w+)\}/g, '{$1}'),
            summary: generateSummary(method, path),
            parameters: extractPathParameters(path),
            responses: [{ code: '200', description: 'Successful response' }]
        });
    }
}

/**
 * Parse vanilla HTTP server
 */
function parseHttpRoutes(content, result) {
    // Common patterns for vanilla Node.js HTTP

    // URL-based routing: if (req.url === '/path')
    const urlPattern = /if\s*\(\s*req\.url\s*===?\s*['"`]([^'"`]+)['"`]/gi;
    let match;

    while ((match = urlPattern.exec(content)) !== null) {
        const path = match[1];

        // Look for method check in context
        const context = getContext(content, match.index, 400);
        const methodMatch = context.match(/req\.method\s*===?\s*['"`](\w+)['"`]/i);
        const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';

        result.endpoints.push({
            method,
            path,
            summary: generateSummary(method, path),
            parameters: extractPathParameters(path),
            responses: [{ code: '200', description: 'Successful response' }]
        });
    }

    // Switch/case on req.url
    const switchPattern = /case\s+['"`]([^'"`]+)['"`]\s*:/gi;
    while ((match = switchPattern.exec(content)) !== null) {
        const path = match[1];
        if (path.startsWith('/')) {
            const context = getContext(content, match.index, 300);
            const methodMatch = context.match(/req\.method\s*===?\s*['"`](\w+)['"`]/i);
            const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';

            if (!result.endpoints.find(e => e.path === path && e.method === method)) {
                result.endpoints.push({
                    method,
                    path,
                    summary: generateSummary(method, path),
                    parameters: [],
                    responses: [{ code: '200', description: 'Successful response' }]
                });
            }
        }
    }
}

// ============ Helper Functions ============

/**
 * Get surrounding context from content
 */
function getContext(content, index, size) {
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + size);
    return content.substring(start, end);
}

/**
 * Extract path parameters
 */
function extractPathParameters(path) {
    const params = [];
    const paramPatterns = [/:(\w+)/g, /\{(\w+)\}/g];

    for (const pattern of paramPatterns) {
        let match;
        while ((match = pattern.exec(path)) !== null) {
            if (!params.find(p => p.name === match[1])) {
                params.push({
                    name: match[1],
                    in: 'path',
                    required: true,
                    schema: { type: detectParamType(match[1]) },
                    description: generateParamDescription(match[1])
                });
            }
        }
    }

    return params;
}

/**
 * Extract query parameters from context
 */
function extractQueryParameters(context) {
    const params = [];
    const patterns = [
        /request\.query\.(\w+)/g,
        /req\.query\.(\w+)/g,
        /query\[['"`](\w+)['"`]\]/g
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(context)) !== null) {
            if (!params.find(p => p.name === match[1])) {
                params.push({
                    name: match[1],
                    in: 'query',
                    required: false,
                    schema: { type: 'string' },
                    description: `Query parameter: ${match[1]}`
                });
            }
        }
    }

    return params;
}

/**
 * Extract body fields from context
 */
function extractBodyFields(context) {
    const fields = new Set();

    // Destructuring: const { field1, field2 } = request.body
    const destructMatch = context.match(/(?:const|let|var)\s*\{([^}]+)\}\s*=\s*(?:request|req)\.body/);
    if (destructMatch) {
        const fieldNames = destructMatch[1].split(',').map(f => f.trim().split(/\s*[=:]\s*/)[0].trim());
        fieldNames.forEach(f => f && fields.add(f));
    }

    // Direct access: request.body.fieldName
    const accessMatches = context.matchAll(/(?:request|req)\.body\.(\w+)/g);
    for (const match of accessMatches) {
        fields.add(match[1]);
    }

    return Array.from(fields);
}

/**
 * Extract fields from schema definition
 */
function extractSchemaFields(schema) {
    const fields = [];
    const fieldPattern = /(\w+)\s*:/g;
    let match;
    while ((match = fieldPattern.exec(schema)) !== null) {
        if (!['type', 'properties', 'required', 'description'].includes(match[1])) {
            fields.push(match[1]);
        }
    }
    return fields;
}

/**
 * Create request body schema
 */
function createRequestBody(fields) {
    const properties = {};
    for (const field of fields) {
        properties[field] = {
            type: detectFieldType(field),
            description: generateFieldDescription(field)
        };
    }

    return {
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties
                }
            }
        }
    };
}

/**
 * Detect parameter type from name
 */
function detectParamType(name) {
    const lower = name.toLowerCase();
    if (lower.includes('id') || lower.includes('count') || lower.includes('num')) return 'integer';
    if (lower.includes('is') || lower.includes('has') || lower.includes('enable')) return 'boolean';
    return 'string';
}

/**
 * Detect field type from name
 */
function detectFieldType(name) {
    const lower = name.toLowerCase();
    if (lower.includes('id') || lower.includes('count') || lower.includes('quantity')) return 'integer';
    if (lower.includes('price') || lower.includes('amount')) return 'number';
    if (lower.includes('is_') || lower.includes('has_') || lower.includes('active')) return 'boolean';
    if (lower.includes('items') || lower.includes('list')) return 'array';
    return 'string';
}

/**
 * Generate parameter description
 */
function generateParamDescription(name) {
    const lower = name.toLowerCase();
    if (lower === 'id') return 'Resource identifier';
    return `${name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')} parameter`;
}

/**
 * Generate field description
 */
function generateFieldDescription(name) {
    const formatted = name.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Generate summary from method and path
 */
function generateSummary(method, path) {
    const resource = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{')).pop() || 'resource';
    const actions = {
        GET: path.includes(':') || path.includes('{') ? 'Obtener' : 'Listar',
        POST: 'Crear',
        PUT: 'Actualizar',
        PATCH: 'Actualizar parcialmente',
        DELETE: 'Eliminar'
    };
    return `${actions[method] || method} ${resource}`;
}

/**
 * Get status code description
 */
function getStatusDescription(code) {
    const descriptions = {
        '200': 'Operación exitosa',
        '201': 'Recurso creado',
        '204': 'Sin contenido',
        '400': 'Solicitud inválida',
        '401': 'No autorizado',
        '403': 'Prohibido',
        '404': 'No encontrado',
        '500': 'Error del servidor'
    };
    return descriptions[code] || `HTTP ${code}`;
}

/**
 * Generate OpenAPI spec from parsed Node.js file
 */
function generateOpenApiSpec(parseResult, fileName) {
    const paths = {};

    for (const endpoint of parseResult.endpoints) {
        const pathKey = endpoint.path
            .replace(/:(\w+)/g, '{$1}')
            .replace(/\/+/g, '/');

        if (!paths[pathKey]) {
            paths[pathKey] = {};
        }

        // Extract request body fields for example generation
        const requestFields = [];
        if (endpoint.requestBody?.content?.['application/json']?.schema?.properties) {
            const props = endpoint.requestBody.content['application/json'].schema.properties;
            for (const [name, schema] of Object.entries(props)) {
                requestFields.push({ name, type: schema.type || 'string' });
            }
        }

        // Get detected status codes
        const responses = endpoint.responses || [{ code: '200', description: 'Successful response' }];
        const detectedStatusCodes = responses.map(r => r.code);

        // Generate examples for this endpoint
        const examples = generateEndpointExamples(
            endpoint.method,
            endpoint.path,
            requestFields,
            requestFields,
            detectedStatusCodes
        );

        const operation = {
            summary: endpoint.summary,
            description: `Server type: ${parseResult.serverType}`,
            tags: [extractTagFromPath(endpoint.path)],
            parameters: endpoint.parameters || [],
            responses: {}
        };

        if (endpoint.requiresAuth || parseResult.hasAuth) {
            operation.security = [{ bearerAuth: [] }];
        }

        // Add request body with example
        if (endpoint.requestBody) {
            operation.requestBody = {
                ...endpoint.requestBody,
                content: {
                    'application/json': {
                        ...endpoint.requestBody.content?.['application/json'],
                        example: examples.request
                    }
                }
            };
        }

        // Add success response with example
        const successCode = endpoint.method === 'POST' ? '201' : '200';
        operation.responses[successCode] = {
            description: endpoint.method === 'POST' ? 'Recurso creado exitosamente' : 'Operación exitosa',
            content: {
                'application/json': {
                    schema: { type: 'object' },
                    example: examples.responses[successCode]
                }
            }
        };

        // Add error responses with examples
        for (const [code, exampleData] of Object.entries(examples.responses)) {
            if (code !== successCode && code !== '201' && code !== '200') {
                operation.responses[code] = {
                    description: getStatusDescription(code),
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: { type: 'string' }
                                }
                            },
                            example: exampleData
                        }
                    }
                };
            }
        }

        paths[pathKey][endpoint.method.toLowerCase()] = operation;
    }

    return {
        openapi: '3.0.0',
        info: {
            title: `API from ${fileName}`,
            version: '1.0.0',
            description: `API generada desde Node.js (${parseResult.serverType})`
        },
        paths,
        components: {
            securitySchemes: parseResult.hasAuth ? {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            } : {}
        }
    };
}

/**
 * Extract tag from path
 */
function extractTagFromPath(path) {
    const parts = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'API';
}

module.exports = {
    parseNodejsFile,
    generateOpenApiSpec,
    detectServerType
};
