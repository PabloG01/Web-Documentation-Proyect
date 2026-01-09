/**
 * Symfony Parser
 * Analyzes Symfony routes and controllers with attributes/annotations
 */

/**
 * Parse Symfony file for API endpoints
 * @param {string} content - File content
 * @param {string} filePath - File path for context
 * @returns {Object} Parsed endpoints and metadata
 */
function parseSymfonyFile(content, filePath) {
    const result = {
        endpoints: [],
        namespace: null,
        isController: false,
        hasAuth: false,
        className: null
    };

    // Detect if this is a controller
    result.isController = /class\s+\w+Controller\s+extends/i.test(content) ||
        /extends\s+AbstractController/i.test(content);

    // Extract class name
    const classMatch = content.match(/class\s+(\w+)/);
    result.className = classMatch ? classMatch[1] : null;

    // Detect namespace
    const namespaceMatch = content.match(/namespace\s+([^;]+)/);
    if (namespaceMatch) {
        result.namespace = namespaceMatch[1].trim();
    }

    // Detect auth requirements
    const authPatterns = [
        /IsGranted/i,
        /Security\s*\(/i,
        /'IS_AUTHENTICATED/i,
        /ROLE_/i
    ];
    result.hasAuth = authPatterns.some(p => p.test(content));

    // Parse routes if controller
    if (result.isController) {
        parseSymfonyController(content, result);
    }

    // Parse routes.yaml style if route file
    if (filePath.includes('routes') && (filePath.endsWith('.yaml') || filePath.endsWith('.yml'))) {
        parseSymfonyRoutesYaml(content, result);
    }

    return result;
}

/**
 * Parse Symfony controller with PHP 8 attributes
 */
function parseSymfonyController(content, result) {
    // Get base route from class-level Route attribute
    let baseRoute = '';
    const classRouteMatch = content.match(/#\[Route\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (classRouteMatch) {
        baseRoute = classRouteMatch[1];
    }

    // Parse methods with Route attributes (PHP 8 style)
    const attributePattern = /#\[Route\s*\(\s*['"`]([^'"`]+)['"`](?:[^)]*methods:\s*\[([^\]]+)\])?[^)]*\)\]\s*(?:#\[[^\]]*\]\s*)*public\s+function\s+(\w+)/gs;
    let match;

    while ((match = attributePattern.exec(content)) !== null) {
        const path = match[1];
        const methodsRaw = match[2];
        const functionName = match[3];

        const methods = methodsRaw
            ? methodsRaw.replace(/['"`]/g, '').split(',').map(m => m.trim().toUpperCase())
            : ['GET'];

        // Get method body for analysis
        const methodStart = match.index + match[0].length;
        const methodEnd = findMethodEnd(content, methodStart);
        const methodBody = content.substring(methodStart, methodEnd);

        for (const method of methods) {
            result.endpoints.push({
                method,
                path: combinePaths(baseRoute, path),
                handler: functionName,
                ...extractSymfonyEndpointDetails(content, match.index, methodBody)
            });
        }
    }

    // Parse legacy annotation style (@Route)
    const annotationPattern = /\*\s*@Route\s*\(\s*["']([^"']+)["'](?:[^)]*methods=\{([^}]+)\})?[^)]*\)\s*[\s\S]*?public\s+function\s+(\w+)/g;
    while ((match = annotationPattern.exec(content)) !== null) {
        const path = match[1];
        const methodsRaw = match[2];
        const functionName = match[3];

        const methods = methodsRaw
            ? methodsRaw.replace(/['"`]/g, '').split(',').map(m => m.trim().toUpperCase())
            : ['GET'];

        for (const method of methods) {
            if (!result.endpoints.find(e => e.path === combinePaths(baseRoute, path) && e.method === method)) {
                result.endpoints.push({
                    method,
                    path: combinePaths(baseRoute, path),
                    handler: functionName,
                    summary: generateSummary(functionName)
                });
            }
        }
    }
}

/**
 * Find end of method body
 */
function findMethodEnd(content, startIndex) {
    let depth = 0;
    let i = startIndex;
    let inMethod = false;

    while (i < content.length) {
        if (content[i] === '{') {
            depth++;
            inMethod = true;
        } else if (content[i] === '}') {
            depth--;
            if (inMethod && depth === 0) {
                return i + 1;
            }
        }
        i++;
    }
    return Math.min(startIndex + 500, content.length);
}

/**
 * Parse Symfony routes.yaml
 */
function parseSymfonyRoutesYaml(content, result) {
    // Simple YAML parsing for routes
    const routePattern = /(\w+):\s*\n\s+path:\s*['"`]?([^\s'"`\n]+)['"`]?\s*\n(?:\s+controller:\s*([^\n]+)\n)?(?:\s+methods:\s*\[?([^\]\n]+)\]?)?/g;
    let match;

    while ((match = routePattern.exec(content)) !== null) {
        const routeName = match[1];
        const path = match[2];
        const controller = match[3]?.trim();
        const methodsRaw = match[4];

        const methods = methodsRaw
            ? methodsRaw.replace(/['"`]/g, '').split(',').map(m => m.trim().toUpperCase())
            : ['GET'];

        for (const method of methods) {
            result.endpoints.push({
                method,
                path: formatSymfonyPath(path),
                handler: controller,
                name: routeName,
                summary: generateSummary(routeName)
            });
        }
    }
}

/**
 * Combine base path with path
 */
function combinePaths(base, path) {
    if (!base) return formatSymfonyPath(path);
    if (!path || path === '/') return formatSymfonyPath(base);
    return formatSymfonyPath(`${base}${path}`);
}

/**
 * Format Symfony path to OpenAPI format
 */
function formatSymfonyPath(path) {
    // Convert {param} to OpenAPI format (already correct)
    return path.replace(/\/+/g, '/');
}

/**
 * Extract endpoint details from context
 */
function extractSymfonyEndpointDetails(content, matchIndex, methodBody) {
    const details = {
        summary: null,
        parameters: [],
        requestBody: null,
        responses: [],
        requiresAuth: false
    };

    // Look for IsGranted or Security attribute before method
    const beforeMethod = content.substring(Math.max(0, matchIndex - 300), matchIndex);
    details.requiresAuth = /IsGranted|Security|ROLE_/i.test(beforeMethod);

    // Extract path parameters
    const paramMatches = methodBody.match(/\{(\w+)\}/g) || [];
    for (const param of paramMatches) {
        const name = param.replace(/[{}]/g, '');
        details.parameters.push({
            name,
            in: 'path',
            required: true,
            schema: { type: name.toLowerCase().includes('id') ? 'integer' : 'string' },
            description: `${name} parameter`
        });
    }

    // Detect request body from $request->get or Request parameter
    if (/Request\s+\$request/i.test(methodBody)) {
        const bodyFields = extractRequestFields(methodBody);
        if (bodyFields.length > 0) {
            details.requestBody = {
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
    }

    // Detect response types
    if (/JsonResponse/i.test(methodBody) || /->json\s*\(/i.test(methodBody)) {
        details.responses.push({ code: '200', description: 'JSON response' });
    }
    if (/Response\s*\(/i.test(methodBody)) {
        details.responses.push({ code: '200', description: 'Response' });
    }
    if (details.responses.length === 0) {
        details.responses.push({ code: '200', description: 'Successful response' });
    }

    return details;
}

/**
 * Extract request fields from method body
 */
function extractRequestFields(body) {
    const fields = new Set();

    // $request->get('field')
    const getMatches = body.matchAll(/\$request->get\s*\(\s*['"`](\w+)['"`]/g);
    for (const match of getMatches) {
        fields.add(match[1]);
    }

    // $request->request->get('field')
    const requestMatches = body.matchAll(/\$request->request->get\s*\(\s*['"`](\w+)['"`]/g);
    for (const match of requestMatches) {
        fields.add(match[1]);
    }

    return Array.from(fields);
}

/**
 * Generate summary from function name
 */
function generateSummary(name) {
    // Convert camelCase or snake_case to readable
    const readable = name
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim();
    return readable.charAt(0).toUpperCase() + readable.slice(1);
}

/**
 * Generate OpenAPI spec from parsed Symfony file
 */
function generateOpenApiSpec(parseResult, fileName) {
    const paths = {};

    for (const endpoint of parseResult.endpoints) {
        const pathKey = endpoint.path;

        if (!paths[pathKey]) {
            paths[pathKey] = {};
        }

        const operation = {
            summary: endpoint.summary || generateSummary(endpoint.handler || 'action'),
            description: endpoint.handler ? `Handler: ${endpoint.handler}` : undefined,
            tags: [extractTagFromPath(endpoint.path)],
            parameters: endpoint.parameters || [],
            responses: {}
        };

        if (endpoint.requiresAuth || parseResult.hasAuth) {
            operation.security = [{ bearerAuth: [] }];
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
            description: 'API generada automáticamente desde código Symfony'
        },
        paths,
        components: {
            securitySchemes: parseResult.hasAuth ? {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer'
                }
            } : {}
        }
    };
}

/**
 * Extract tag from path
 */
function extractTagFromPath(path) {
    const parts = path.split('/').filter(p => p && !p.startsWith('{'));
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'General';
}

module.exports = {
    parseSymfonyFile,
    generateOpenApiSpec
};
