/**
 * AST-based Parser for JavaScript/TypeScript
 * Uses @babel/parser for accurate code analysis
 */

const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

/**
 * Parse JavaScript/TypeScript file using AST
 * @param {string} content - File content
 * @param {string} filePath - File path for context
 * @returns {Object} Parsed endpoints and metadata
 */
function parseWithAST(content, filePath) {
    const result = {
        endpoints: [],
        hasAuth: false,
        imports: [],
        exports: [],
        framework: null
    };

    try {
        // Parse the code into AST
        const ast = babelParser.parse(content, {
            sourceType: 'module',
            plugins: [
                'jsx',
                'typescript',
                'decorators-legacy',
                'classProperties',
                'optionalChaining',
                'nullishCoalescingOperator'
            ],
            errorRecovery: true // Continue parsing even with errors
        });

        const seenEndpoints = new Set();

        // Traverse the AST
        traverse(ast, {
            // Detect imports
            ImportDeclaration(path) {
                const source = path.node.source.value;
                result.imports.push(source);

                // Detect framework from imports
                if (source === 'express') result.framework = 'express';
                if (source === 'fastify') result.framework = 'fastify';
                if (source === 'koa') result.framework = 'koa';
                if (source === '@hapi/hapi') result.framework = 'hapi';
            },

            // Detect require() calls
            CallExpression(path) {
                const callee = path.node.callee;

                // Handle require('module')
                if (callee.name === 'require' && path.node.arguments[0]?.value) {
                    const moduleName = path.node.arguments[0].value;
                    result.imports.push(moduleName);

                    if (moduleName === 'express') result.framework = 'express';
                    if (moduleName === 'fastify') result.framework = 'fastify';
                    if (moduleName === 'koa') result.framework = 'koa';
                }

                // Handle route definitions: router.get('/path', handler) or app.get('/path', handler)
                if (callee.type === 'MemberExpression') {
                    const object = callee.object;
                    const property = callee.property;

                    // Check if it's a route method call
                    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
                    const routerNames = ['router', 'app', 'server', 'fastify', 'api'];

                    if (property.type === 'Identifier' && httpMethods.includes(property.name)) {
                        // Check if object is a known router
                        const objectName = object.type === 'Identifier' ? object.name : null;

                        if (objectName && routerNames.includes(objectName.toLowerCase())) {
                            // Get the path argument
                            const args = path.node.arguments;
                            if (args.length > 0 && args[0].type === 'StringLiteral') {
                                const routePath = args[0].value;
                                const method = property.name.toUpperCase();
                                const key = `${method}:${routePath}`;

                                if (!seenEndpoints.has(key)) {
                                    seenEndpoints.add(key);

                                    // Extract handler info
                                    const handlerInfo = extractHandlerInfo(args, path, content);

                                    result.endpoints.push({
                                        method,
                                        path: routePath,
                                        ...handlerInfo,
                                        line: path.node.loc?.start?.line
                                    });
                                }
                            }
                        }
                    }

                    // Check for chained .route('/path').get().post()
                    if (property.name === 'route' && path.node.arguments[0]?.type === 'StringLiteral') {
                        const routePath = path.node.arguments[0].value;

                        // Look at parent for chained methods
                        const parent = path.parentPath;
                        if (parent && parent.node.type === 'MemberExpression') {
                            const chainedMethod = parent.node.property?.name;
                            if (chainedMethod && httpMethods.includes(chainedMethod)) {
                                const method = chainedMethod.toUpperCase();
                                const key = `${method}:${routePath}`;

                                if (!seenEndpoints.has(key)) {
                                    seenEndpoints.add(key);
                                    result.endpoints.push({
                                        method,
                                        path: routePath,
                                        line: path.node.loc?.start?.line
                                    });
                                }
                            }
                        }
                    }
                }
            },

            // Detect auth middleware usage
            Identifier(path) {
                const authPatterns = ['verifyToken', 'authenticate', 'isAuthenticated', 'passport', 'jwt', 'auth'];
                if (authPatterns.some(p => path.node.name.toLowerCase().includes(p.toLowerCase()))) {
                    result.hasAuth = true;
                }
            }
        });

    } catch (error) {
        console.error('AST parsing error:', error.message);
        // Return empty result on error, fallback to regex
        return null;
    }

    return result;
}

/**
 * Extract information from route handler
 */
function extractHandlerInfo(args, path, content) {
    const info = {
        parameters: [],
        requestBody: null,
        responses: [],
        requiresAuth: false,
        summary: null,
        middlewares: []
    };

    // Check for middleware in route arguments
    for (let i = 1; i < args.length - 1; i++) {
        const arg = args[i];
        if (arg.type === 'Identifier') {
            info.middlewares.push(arg.name);
            if (['verifyToken', 'authenticate', 'auth', 'isAuthenticated'].some(a =>
                arg.name.toLowerCase().includes(a.toLowerCase())
            )) {
                info.requiresAuth = true;
            }
        }
    }

    // Get the last argument (usually the handler)
    const handler = args[args.length - 1];

    if (handler) {
        // Extract handler body for analysis
        const handlerBody = extractHandlerBody(handler, content);

        if (handlerBody) {
            // Extract path parameters
            const pathMatch = args[0]?.value?.match(/:(\w+)/g) || [];
            for (const param of pathMatch) {
                info.parameters.push({
                    name: param.replace(':', ''),
                    in: 'path',
                    required: true,
                    schema: { type: 'string' }
                });
            }

            // Analyze handler body for req.body, req.query usage
            const bodyFields = extractBodyFromHandler(handlerBody);
            if (bodyFields.length > 0) {
                info.requestBody = {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: bodyFields.reduce((acc, f) => {
                                    acc[f] = { type: 'string' };
                                    return acc;
                                }, {})
                            }
                        }
                    }
                };
            }

            // Extract query parameters
            const queryParams = extractQueryFromHandler(handlerBody);
            for (const param of queryParams) {
                if (!info.parameters.find(p => p.name === param)) {
                    info.parameters.push({
                        name: param,
                        in: 'query',
                        required: false,
                        schema: { type: 'string' }
                    });
                }
            }

            // Extract response status codes
            const statusCodes = extractStatusCodes(handlerBody);
            info.responses = statusCodes.map(code => ({
                code: code.toString(),
                description: getStatusDescription(code)
            }));
        }
    }

    if (info.responses.length === 0) {
        info.responses = [{ code: '200', description: 'Successful response' }];
    }

    return info;
}

/**
 * Extract handler function body as string
 */
function extractHandlerBody(handler, content) {
    if (handler.loc) {
        const start = handler.loc.start;
        const end = handler.loc.end;
        const lines = content.split('\n');

        let body = '';
        for (let i = start.line - 1; i < end.line; i++) {
            if (i === start.line - 1) {
                body += lines[i].substring(start.column);
            } else if (i === end.line - 1) {
                body += '\n' + lines[i].substring(0, end.column);
            } else {
                body += '\n' + lines[i];
            }
        }
        return body;
    }
    return null;
}

/**
 * Extract body fields from handler
 */
function extractBodyFromHandler(body) {
    const fields = new Set();

    // Destructuring: const { field1, field2 } = req.body
    const destructMatch = body.match(/(?:const|let|var)\s*\{([^}]+)\}\s*=\s*req\.body/);
    if (destructMatch) {
        const fieldNames = destructMatch[1].split(',').map(f => f.trim().split(/\s*[=:]\s*/)[0].trim());
        fieldNames.forEach(f => f && fields.add(f));
    }

    // Direct access: req.body.fieldName
    const directMatches = body.matchAll(/req\.body\.(\w+)/g);
    for (const match of directMatches) {
        fields.add(match[1]);
    }

    return Array.from(fields);
}

/**
 * Extract query parameters from handler
 */
function extractQueryFromHandler(body) {
    const params = new Set();

    // req.query.param or req.query['param']
    const queryMatches = body.matchAll(/req\.query\.(\w+)|req\.query\[['"](\w+)['"]\]/g);
    for (const match of queryMatches) {
        params.add(match[1] || match[2]);
    }

    // Destructuring: const { param } = req.query
    const destructMatch = body.match(/(?:const|let|var)\s*\{([^}]+)\}\s*=\s*req\.query/);
    if (destructMatch) {
        const paramNames = destructMatch[1].split(',').map(p => p.trim().split(/\s*[=:]\s*/)[0].trim());
        paramNames.forEach(p => p && params.add(p));
    }

    return Array.from(params);
}

/**
 * Extract status codes from handler
 */
function extractStatusCodes(body) {
    const codes = new Set();

    // res.status(XXX)
    const statusMatches = body.matchAll(/\.status\s*\(\s*(\d+)\s*\)/g);
    for (const match of statusMatches) {
        codes.add(parseInt(match[1]));
    }

    // res.sendStatus(XXX)
    const sendStatusMatches = body.matchAll(/\.sendStatus\s*\(\s*(\d+)\s*\)/g);
    for (const match of sendStatusMatches) {
        codes.add(parseInt(match[1]));
    }

    return Array.from(codes);
}

/**
 * Get status description
 */
function getStatusDescription(code) {
    const descriptions = {
        200: 'Successful response',
        201: 'Created successfully',
        204: 'No content',
        400: 'Bad request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not found',
        409: 'Conflict',
        422: 'Unprocessable entity',
        500: 'Internal server error'
    };
    return descriptions[code] || `HTTP ${code}`;
}

/**
 * Generate OpenAPI spec from AST parse result
 */
function generateOpenApiSpec(parseResult, fileName) {
    const paths = {};

    for (const endpoint of parseResult.endpoints) {
        const pathKey = endpoint.path.replace(/:(\w+)/g, '{$1}');

        if (!paths[pathKey]) {
            paths[pathKey] = {};
        }

        const operation = {
            summary: endpoint.summary || generateSummary(endpoint.method, endpoint.path),
            tags: [extractTagFromPath(endpoint.path)],
            parameters: endpoint.parameters || [],
            responses: {}
        };

        if (endpoint.requiresAuth || parseResult.hasAuth) {
            operation.security = [{ cookieAuth: [] }];
        }

        if (endpoint.requestBody) {
            operation.requestBody = endpoint.requestBody;
        }

        const responses = endpoint.responses || [{ code: '200', description: 'Successful response' }];
        for (const response of responses) {
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
            description: `API parsed using AST analysis (${parseResult.framework || 'unknown framework'})`
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
 * Generate summary from method and path
 */
function generateSummary(method, path) {
    const resource = path.split('/').filter(p => p && !p.startsWith(':')).pop() || 'resource';
    const actions = {
        GET: path.includes(':') ? 'Get' : 'List',
        POST: 'Create',
        PUT: 'Update',
        PATCH: 'Partial update',
        DELETE: 'Delete'
    };
    return `${actions[method] || method} ${resource}`;
}

/**
 * Extract tag from path
 */
function extractTagFromPath(path) {
    const parts = path.split('/').filter(p => p && !p.startsWith(':'));
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'API';
}

module.exports = {
    parseWithAST,
    generateOpenApiSpec
};
