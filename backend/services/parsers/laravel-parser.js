/**
 * Laravel Parser
 * Analyzes Laravel routes and controllers
 */

/**
 * Parse Laravel file for API endpoints
 * @param {string} content - File content
 * @param {string} filePath - File path for context
 * @returns {Object} Parsed endpoints and metadata
 */
function parseLaravelFile(content, filePath) {
    const result = {
        endpoints: [],
        middleware: [],
        namespace: null,
        isController: false,
        hasAuth: false
    };

    // Detect if this is a controller
    result.isController = /class\s+\w+Controller\s+extends/i.test(content);

    // Detect namespace
    const namespaceMatch = content.match(/namespace\s+([^;]+)/);
    if (namespaceMatch) {
        result.namespace = namespaceMatch[1].trim();
    }

    // Detect auth middleware
    const authPatterns = [
        /middleware\s*\(\s*['"`]auth/i,
        /middleware\s*\(\s*\[.*['"`]auth/i,
        /'middleware'\s*=>\s*['"`]auth/i,
        /sanctum/i,
        /passport/i
    ];
    result.hasAuth = authPatterns.some(p => p.test(content));

    // Parse routes from web.php or api.php
    if (filePath.includes('routes/')) {
        parseRouteFile(content, result);
    }

    // Parse controller methods
    if (result.isController) {
        parseController(content, result);
    }

    return result;
}

/**
 * Parse Laravel route file
 */
function parseRouteFile(content, result) {
    // Route::method('/path', ...)
    const routePatterns = [
        /Route::(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /Route::resource\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /Route::apiResource\s*\(\s*['"`]([^'"`]+)['"`]/gi
    ];

    // Standard routes
    const standardRoute = /Route::(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:\[([^\]]+)\]|['"`]([^'"`]+)['"`]|([^)]+))/gi;
    let match;

    while ((match = standardRoute.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const path = match[2];
        const handler = match[3] || match[4] || match[5];

        result.endpoints.push({
            method,
            path: formatLaravelPath(path),
            handler: handler?.trim(),
            ...extractLaravelEndpointDetails(content, method, path)
        });
    }

    // Resource routes (generate CRUD endpoints)
    const resourceRoute = /Route::(resource|apiResource)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    while ((match = resourceRoute.exec(content)) !== null) {
        const isApi = match[1] === 'apiResource';
        const resource = match[2];

        const resourceEndpoints = generateResourceEndpoints(resource, isApi);
        result.endpoints.push(...resourceEndpoints);
    }

    // Route groups with prefix
    const groupPattern = /Route::prefix\s*\(\s*['"`]([^'"`]+)['"`]\s*\)[^{]*\{([^}]+)\}/gs;
    while ((match = groupPattern.exec(content)) !== null) {
        const prefix = match[1];
        const groupContent = match[2];

        // Parse routes inside group
        const innerRoute = /Route::(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
        let innerMatch;
        while ((innerMatch = innerRoute.exec(groupContent)) !== null) {
            result.endpoints.push({
                method: innerMatch[1].toUpperCase(),
                path: formatLaravelPath(`${prefix}/${innerMatch[2]}`),
                ...extractLaravelEndpointDetails(groupContent, innerMatch[1], innerMatch[2])
            });
        }
    }
}

/**
 * Parse Laravel controller
 */
function parseController(content, result) {
    // Extract class name
    const classMatch = content.match(/class\s+(\w+)Controller/);
    const controllerName = classMatch ? classMatch[1] : 'Resource';

    // Parse public methods
    const methodPattern = /public\s+function\s+(\w+)\s*\([^)]*\)/gi;
    let match;

    while ((match = methodPattern.exec(content)) !== null) {
        const methodName = match[1];

        // Skip constructor and non-action methods
        if (['__construct', '__invoke', 'middleware'].includes(methodName)) continue;

        // Get method body context
        const startIndex = match.index;
        const endIndex = findMethodEnd(content, startIndex);
        const methodBody = content.substring(startIndex, endIndex);

        const endpoint = {
            method: inferHttpMethod(methodName),
            path: inferPathFromMethod(methodName, controllerName),
            handler: `${controllerName}Controller@${methodName}`,
            ...extractFromMethodBody(methodBody, methodName)
        };

        result.endpoints.push(endpoint);
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
 * Generate resource endpoints
 */
function generateResourceEndpoints(resource, isApi) {
    const basePath = `/${resource}`;
    const endpoints = [
        { method: 'GET', path: basePath, action: 'index', summary: `Listar ${resource}` },
        { method: 'POST', path: basePath, action: 'store', summary: `Crear ${resource}` },
        { method: 'GET', path: `${basePath}/{id}`, action: 'show', summary: `Mostrar ${resource}` },
        { method: 'PUT', path: `${basePath}/{id}`, action: 'update', summary: `Actualizar ${resource}` },
        { method: 'DELETE', path: `${basePath}/{id}`, action: 'destroy', summary: `Eliminar ${resource}` }
    ];

    if (!isApi) {
        endpoints.push(
            { method: 'GET', path: `${basePath}/create`, action: 'create', summary: `Formulario crear ${resource}` },
            { method: 'GET', path: `${basePath}/{id}/edit`, action: 'edit', summary: `Formulario editar ${resource}` }
        );
    }

    return endpoints;
}

/**
 * Format Laravel path to OpenAPI format
 */
function formatLaravelPath(path) {
    // Convert {param} to OpenAPI format (already correct)
    // Convert Laravel optional params {param?} to {param}
    return path.replace(/\{(\w+)\?\}/g, '{$1}');
}

/**
 * Infer HTTP method from function name
 */
function inferHttpMethod(methodName) {
    const methodMap = {
        index: 'GET',
        show: 'GET',
        create: 'GET',
        store: 'POST',
        edit: 'GET',
        update: 'PUT',
        destroy: 'DELETE',
        delete: 'DELETE',
        get: 'GET',
        post: 'POST',
        put: 'PUT',
        patch: 'PATCH'
    };

    const lower = methodName.toLowerCase();
    for (const [key, method] of Object.entries(methodMap)) {
        if (lower.includes(key)) return method;
    }
    return 'GET';
}

/**
 * Infer path from method name
 */
function inferPathFromMethod(methodName, resourceName) {
    const lower = methodName.toLowerCase();
    const resource = resourceName.toLowerCase();

    if (lower === 'index') return `/${resource}`;
    if (lower === 'show') return `/${resource}/{id}`;
    if (lower === 'store') return `/${resource}`;
    if (lower === 'update') return `/${resource}/{id}`;
    if (lower === 'destroy') return `/${resource}/{id}`;
    if (lower === 'create') return `/${resource}/create`;
    if (lower === 'edit') return `/${resource}/{id}/edit`;

    return `/${resource}/${lower}`;
}

/**
 * Extract details from method body
 */
function extractFromMethodBody(body, methodName) {
    const details = {
        summary: generateLaravelSummary(methodName),
        parameters: [],
        requestBody: null,
        responses: [],
        requiresAuth: false
    };

    // Check for validation rules
    const validationMatch = body.match(/\$request->validate\s*\(\s*\[([^\]]+)\]/s);
    if (validationMatch) {
        const rules = parseValidationRules(validationMatch[1]);
        details.requestBody = {
            description: 'Request body',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: rules.properties,
                        required: rules.required
                    }
                }
            }
        };
    }

    // Detect response patterns
    if (/return\s+response\(\)->json/i.test(body)) {
        details.responses.push({ code: '200', description: 'JSON response' });
    }
    if (/return\s+\$\w+/i.test(body)) {
        details.responses.push({ code: '200', description: 'Resource response' });
    }
    if (details.responses.length === 0) {
        details.responses.push({ code: '200', description: 'Successful response' });
    }

    return details;
}

/**
 * Parse Laravel validation rules
 */
function parseValidationRules(rulesString) {
    const properties = {};
    const required = [];

    // Match 'field' => 'rules' or 'field' => ['rules']
    const rulePattern = /['"`](\w+)['"`]\s*=>\s*(?:\[([^\]]+)\]|['"`]([^'"`]+)['"`])/g;
    let match;

    while ((match = rulePattern.exec(rulesString)) !== null) {
        const field = match[1];
        const rules = match[2] || match[3] || '';

        const isRequired = rules.includes('required');
        const type = inferTypeFromRules(rules);

        properties[field] = {
            type,
            description: `Campo ${field}`
        };

        if (isRequired) {
            required.push(field);
        }
    }

    return { properties, required };
}

/**
 * Infer type from Laravel validation rules
 */
function inferTypeFromRules(rules) {
    if (rules.includes('integer') || rules.includes('numeric')) return 'integer';
    if (rules.includes('boolean')) return 'boolean';
    if (rules.includes('array')) return 'array';
    if (rules.includes('email')) return 'string';
    if (rules.includes('date')) return 'string';
    return 'string';
}

/**
 * Generate summary from method name
 */
function generateLaravelSummary(methodName) {
    const summaries = {
        index: 'Listar recursos',
        show: 'Mostrar recurso',
        store: 'Crear recurso',
        update: 'Actualizar recurso',
        destroy: 'Eliminar recurso',
        create: 'Formulario de creación',
        edit: 'Formulario de edición'
    };
    return summaries[methodName.toLowerCase()] || `Ejecutar ${methodName}`;
}

/**
 * Extract endpoint details from route context
 */
function extractLaravelEndpointDetails(context, method, path) {
    return {
        summary: generatePathSummary(method, path),
        parameters: extractPathParameters(path),
        requiresAuth: /middleware.*auth|sanctum|passport/i.test(context)
    };
}

/**
 * Generate summary from path
 */
function generatePathSummary(method, path) {
    const resource = path.split('/').filter(p => p && !p.startsWith('{'))[0] || 'resource';
    const actions = {
        GET: path.includes('{') ? 'Obtener' : 'Listar',
        POST: 'Crear',
        PUT: 'Actualizar',
        PATCH: 'Actualizar',
        DELETE: 'Eliminar'
    };
    return `${actions[method.toUpperCase()] || method} ${resource}`;
}

/**
 * Extract path parameters
 */
function extractPathParameters(path) {
    const params = [];
    const paramMatches = path.match(/\{(\w+)\}/g) || [];

    for (const param of paramMatches) {
        const name = param.replace(/[{}]/g, '');
        params.push({
            name,
            in: 'path',
            required: true,
            schema: { type: name.toLowerCase().includes('id') ? 'integer' : 'string' },
            description: `${name} parameter`
        });
    }

    return params;
}

/**
 * Generate OpenAPI spec from parsed Laravel file
 */
function generateOpenApiSpec(parseResult, fileName) {
    const paths = {};

    for (const endpoint of parseResult.endpoints) {
        const pathKey = endpoint.path;

        if (!paths[pathKey]) {
            paths[pathKey] = {};
        }

        const operation = {
            summary: endpoint.summary,
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
            description: 'API generada automáticamente desde código Laravel'
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
    const parts = path.split('/').filter(p => p && !p.startsWith('{'));
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'General';
}

module.exports = {
    parseLaravelFile,
    generateOpenApiSpec
};
