/**
 * Express.js Parser
 * Deep analysis of Express routes using regex and pattern matching
 */

/**
 * Parse Express.js file for API endpoints
 * @param {string} content - File content
 * @param {string} filePath - File path for context
 * @returns {Object} Parsed endpoints and metadata
 */
function parseExpressFile(content, filePath) {
    const result = {
        endpoints: [],
        middleware: [],
        baseRoute: null,
        imports: [],
        hasAuth: false
    };

    // Detect base route from router mount or file path
    const routerMountMatch = content.match(/app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,/);
    if (routerMountMatch) {
        result.baseRoute = routerMountMatch[1];
    }

    // Detect imports for context
    const importMatches = content.matchAll(/(?:require|import)\s*\(?['"`]([^'"`]+)['"`]\)?/g);
    for (const match of importMatches) {
        result.imports.push(match[1]);
    }

    // Detect if auth middleware is used
    const authPatterns = [
        /verifyToken/i, /authenticate/i, /isAuthenticated/i, /requireAuth/i,
        /passport\.authenticate/i, /jwt/i, /authMiddleware/i
    ];
    result.hasAuth = authPatterns.some(p => p.test(content));

    // Parse route definitions - track seen to avoid duplicates
    const seenEndpoints = new Set();

    // Pattern 1: router.method('/path', ...) or app.method('/path', ...)
    const standardRoutePattern = /(?:router|app)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let match;

    while ((match = standardRoutePattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const path = match[2];
        const key = `${method}:${path}`;

        if (seenEndpoints.has(key)) continue;
        seenEndpoints.add(key);

        // Get surrounding context for better analysis
        const startIndex = Math.max(0, match.index - 500);
        const endIndex = Math.min(content.length, match.index + 1000);
        const context = content.substring(startIndex, endIndex);

        const endpoint = {
            method,
            path,
            fullPath: result.baseRoute ? `${result.baseRoute}${path}` : path,
            ...extractEndpointDetails(context, method, path)
        };

        result.endpoints.push(endpoint);
    }

    // Pattern 2: Express router.route('/path').get().post()
    const chainedRoutePattern = /\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\.(get|post|put|patch|delete)/gi;
    while ((match = chainedRoutePattern.exec(content)) !== null) {
        const path = match[1];  // Path is first capture group
        const method = match[2].toUpperCase();  // Method is second
        const key = `${method}:${path}`;

        if (seenEndpoints.has(key)) continue;
        seenEndpoints.add(key);

        const startIndex = Math.max(0, match.index - 500);
        const endIndex = Math.min(content.length, match.index + 1000);
        const context = content.substring(startIndex, endIndex);

        const endpoint = {
            method,
            path,
            fullPath: result.baseRoute ? `${result.baseRoute}${path}` : path,
            ...extractEndpointDetails(context, method, path)
        };

        result.endpoints.push(endpoint);
    }

    // Detect middleware
    const middlewarePatterns = [
        /app\.use\s*\(\s*([^)]+)\)/g,
        /router\.use\s*\(\s*([^)]+)\)/g
    ];

    for (const pattern of middlewarePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            result.middleware.push(match[1].trim());
        }
    }

    return result;
}

/**
 * Extract details from route context
 */
function extractEndpointDetails(context, method, path) {
    const details = {
        description: null,
        summary: null,
        parameters: [],
        requestBody: null,
        responses: [],
        requiresAuth: false,
        tags: []
    };

    // Check for authentication middleware in route
    const authInRoute = /verifyToken|authenticate|isAuthenticated|requireAuth|passport/i.test(context);
    details.requiresAuth = authInRoute;

    // Extract path parameters
    const pathParams = path.match(/:(\w+)/g) || [];
    for (const param of pathParams) {
        const paramName = param.replace(':', '');
        details.parameters.push({
            name: paramName,
            in: 'path',
            required: true,
            schema: { type: detectParamType(paramName) },
            description: generateParamDescription(paramName)
        });
    }

    // Detect query parameters from req.query usage
    const queryMatches = context.matchAll(/req\.query\.(\w+)|req\.query\[['"`](\w+)['"`]\]/g);
    for (const match of queryMatches) {
        const paramName = match[1] || match[2];
        if (!details.parameters.find(p => p.name === paramName)) {
            details.parameters.push({
                name: paramName,
                in: 'query',
                required: false,
                schema: { type: 'string' },
                description: `Query parameter: ${paramName}`
            });
        }
    }

    // Detect request body fields from req.body usage
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const bodyFields = extractBodyFields(context);
        if (bodyFields.length > 0) {
            details.requestBody = {
                description: 'Request body',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: bodyFields.reduce((acc, field) => {
                                acc[field.name] = {
                                    type: field.type,
                                    description: field.description
                                };
                                return acc;
                            }, {}),
                            required: bodyFields.filter(f => f.required).map(f => f.name)
                        }
                    }
                }
            };
        }
    }

    // Detect response patterns
    details.responses = extractResponses(context);

    // Generate summary from path and method
    details.summary = generateSummary(method, path);

    return details;
}

/**
 * Extract body fields from context
 */
function extractBodyFields(context) {
    const fields = [];
    const seen = new Set();

    // Destructuring: const { field1, field2 } = req.body
    const destructMatch = context.match(/(?:const|let|var)\s*\{([^}]+)\}\s*=\s*req\.body/);
    if (destructMatch) {
        const fieldNames = destructMatch[1].split(',').map(f => f.trim().split(/\s*[=:]\s*/)[0].trim());
        for (const name of fieldNames) {
            if (name && !seen.has(name)) {
                seen.add(name);
                fields.push({
                    name,
                    type: detectFieldType(name),
                    description: generateFieldDescription(name),
                    required: true
                });
            }
        }
    }

    // Direct access: req.body.fieldName
    const directMatches = context.matchAll(/req\.body\.(\w+)/g);
    for (const match of directMatches) {
        const name = match[1];
        if (!seen.has(name)) {
            seen.add(name);
            fields.push({
                name,
                type: detectFieldType(name),
                description: generateFieldDescription(name),
                required: false
            });
        }
    }

    return fields;
}

/**
 * Extract response patterns
 */
function extractResponses(context) {
    const responses = [];

    // res.status(XXX).json()
    const statusMatches = context.matchAll(/res\.status\((\d+)\)/g);
    for (const match of statusMatches) {
        const code = match[1];
        if (!responses.find(r => r.code === code)) {
            responses.push({
                code,
                description: getStatusDescription(code)
            });
        }
    }

    // res.json() without explicit status (200)
    if (/res\.json\s*\(/.test(context) && !responses.find(r => r.code === '200')) {
        responses.push({ code: '200', description: 'Successful response' });
    }

    // res.send() without explicit status (200)
    if (/res\.send\s*\(/.test(context) && !responses.find(r => r.code === '200')) {
        responses.push({ code: '200', description: 'Successful response' });
    }

    // Default responses if none found
    if (responses.length === 0) {
        responses.push({ code: '200', description: 'Successful response' });
    }

    return responses;
}

/**
 * Detect parameter type from name
 */
function detectParamType(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('id') || nameLower.includes('count') || nameLower.includes('num')) {
        return 'integer';
    }
    if (nameLower.includes('date') || nameLower.includes('time')) {
        return 'string'; // with format date-time
    }
    if (nameLower.includes('is') || nameLower.includes('has') || nameLower.includes('enable')) {
        return 'boolean';
    }
    return 'string';
}

/**
 * Detect field type from name
 */
function detectFieldType(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('email')) return 'string';
    if (nameLower.includes('password')) return 'string';
    if (nameLower.includes('id') || nameLower.includes('count') || nameLower.includes('quantity')) return 'integer';
    if (nameLower.includes('price') || nameLower.includes('amount') || nameLower.includes('total')) return 'number';
    if (nameLower.includes('is_') || nameLower.includes('has_') || nameLower.includes('active')) return 'boolean';
    if (nameLower.includes('date') || nameLower.includes('created') || nameLower.includes('updated')) return 'string';
    if (nameLower.includes('items') || nameLower.includes('list') || nameLower.includes('array')) return 'array';
    return 'string';
}

/**
 * Generate parameter description
 */
function generateParamDescription(name) {
    const nameLower = name.toLowerCase();
    if (nameLower === 'id') return 'Resource identifier';
    if (nameLower.includes('user')) return 'User identifier';
    if (nameLower.includes('project')) return 'Project identifier';
    if (nameLower.includes('doc')) return 'Document identifier';
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
    const resource = path.split('/').filter(p => p && !p.startsWith(':')).pop() || 'resource';
    const actions = {
        GET: 'Obtener',
        POST: 'Crear',
        PUT: 'Actualizar',
        PATCH: 'Actualizar parcialmente',
        DELETE: 'Eliminar'
    };
    const action = actions[method] || method;
    const hasId = path.includes(':');

    if (hasId && method === 'GET') {
        return `${action} ${resource} por ID`;
    }
    if (hasId && method === 'DELETE') {
        return `${action} ${resource}`;
    }
    if (method === 'GET') {
        return `Listar ${resource}`;
    }
    return `${action} ${resource}`;
}

/**
 * Get status code description
 */
function getStatusDescription(code) {
    const descriptions = {
        '200': 'Operación exitosa',
        '201': 'Recurso creado exitosamente',
        '204': 'Sin contenido',
        '400': 'Solicitud inválida',
        '401': 'No autorizado',
        '403': 'Acceso denegado',
        '404': 'Recurso no encontrado',
        '409': 'Conflicto',
        '422': 'Entidad no procesable',
        '500': 'Error interno del servidor'
    };
    return descriptions[code] || `HTTP ${code}`;
}

/**
 * Generate OpenAPI spec from parsed Express file
 */
function generateOpenApiSpec(parseResult, fileName) {
    const paths = {};

    for (const endpoint of parseResult.endpoints) {
        const pathKey = endpoint.fullPath.replace(/:(\w+)/g, '{$1}');

        if (!paths[pathKey]) {
            paths[pathKey] = {};
        }

        const operation = {
            summary: endpoint.summary,
            description: endpoint.description || `Endpoint: ${endpoint.method} ${endpoint.path}`,
            tags: endpoint.tags.length > 0 ? endpoint.tags : [extractTagFromPath(endpoint.path)],
            parameters: endpoint.parameters,
            responses: {}
        };

        // Add security if auth required
        if (endpoint.requiresAuth) {
            operation.security = [{ cookieAuth: [] }];
        }

        // Add request body
        if (endpoint.requestBody) {
            operation.requestBody = endpoint.requestBody;
        }

        // Add responses
        for (const response of endpoint.responses) {
            operation.responses[response.code] = {
                description: response.description,
                content: {
                    'application/json': {
                        schema: { type: 'object' }
                    }
                }
            };
        }

        paths[pathKey][endpoint.method.toLowerCase()] = operation;
    }

    return {
        openapi: '3.0.0',
        info: {
            title: `API from ${fileName}`,
            version: '1.0.0',
            description: parseResult.hasAuth
                ? 'API con autenticación requerida para algunos endpoints'
                : 'API generada automáticamente desde código Express.js'
        },
        paths,
        components: {
            securitySchemes: parseResult.hasAuth ? {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'auth_token'
                }
            } : {}
        }
    };
}

/**
 * Extract tag from path
 */
function extractTagFromPath(path) {
    const parts = path.split('/').filter(p => p && !p.startsWith(':'));
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'General';
}

module.exports = {
    parseExpressFile,
    generateOpenApiSpec
};
