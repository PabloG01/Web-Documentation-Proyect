/**
 * Next.js Parser
 * Analyzes Next.js API routes (pages/api and app/api)
 */

/**
 * Parse Next.js API file for endpoints
 * @param {string} content - File content
 * @param {string} filePath - File path for context
 * @returns {Object} Parsed endpoints and metadata
 */
function parseNextjsFile(content, filePath) {
    const result = {
        endpoints: [],
        isAppRouter: filePath.includes('/app/'),
        isPagesRouter: filePath.includes('/pages/'),
        hasAuth: false
    };

    // Detect auth patterns
    const authPatterns = [
        /getSession/i,
        /useSession/i,
        /getToken/i,
        /withAuth/i,
        /NextAuth/i,
        /verifyToken/i,
        /authenticated/i
    ];
    result.hasAuth = authPatterns.some(p => p.test(content));

    // Determine path from file path
    const apiPath = extractApiPath(filePath);

    if (result.isAppRouter) {
        parseAppRouterFile(content, apiPath, result);
    } else if (result.isPagesRouter) {
        parsePagesRouterFile(content, apiPath, result);
    }

    return result;
}

/**
 * Extract API path from file path
 */
function extractApiPath(filePath) {
    // Normalize path separators
    const normalized = filePath.replace(/\\/g, '/');

    // App Router: app/api/users/route.ts -> /api/users
    let match = normalized.match(/app\/api\/(.+?)\/route\.[jt]sx?$/);
    if (match) {
        return '/api/' + match[1];
    }

    // Pages Router: pages/api/users/index.ts -> /api/users
    match = normalized.match(/pages\/api\/(.+?)\.[jt]sx?$/);
    if (match) {
        let path = match[1];
        if (path.endsWith('/index')) {
            path = path.slice(0, -6);
        }
        return '/api/' + path;
    }

    // Pages Router: pages/api/users.ts -> /api/users
    match = normalized.match(/pages\/api\/(.+)\.[jt]sx?$/);
    if (match) {
        return '/api/' + match[1];
    }

    return '/api/unknown';
}

/**
 * Parse App Router style (Next.js 13+)
 */
function parseAppRouterFile(content, basePath, result) {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

    for (const method of methods) {
        // export async function GET() or export const GET = 
        const pattern = new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${method}\\s*[=(]`, 'g');

        if (pattern.test(content)) {
            // Find the function body
            const funcPattern = new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${method}[^{]*\\{`, 'g');
            const match = funcPattern.exec(content);

            let functionBody = '';
            if (match) {
                functionBody = extractFunctionBody(content, match.index + match[0].length);
            }

            result.endpoints.push({
                method,
                path: formatNextjsPath(basePath),
                ...extractNextjsEndpointDetails(functionBody, method)
            });
        }
    }
}

/**
 * Parse Pages Router style (Next.js 12 and earlier)
 */
function parsePagesRouterFile(content, basePath, result) {
    // Default export handler
    const defaultExport = /export\s+default\s+(?:async\s+)?function\s*\w*\s*\([^)]*\)\s*\{/g;

    if (defaultExport.test(content)) {
        // Check for method handling in the body
        const methodChecks = content.match(/req\.method\s*===?\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/gi) || [];

        if (methodChecks.length > 0) {
            for (const check of methodChecks) {
                const method = check.match(/['"`](GET|POST|PUT|PATCH|DELETE)['"`]/i)[1].toUpperCase();
                result.endpoints.push({
                    method,
                    path: formatNextjsPath(basePath),
                    ...extractNextjsEndpointDetails(content, method)
                });
            }
        } else {
            // No method checks, assume it handles all methods or just GET
            result.endpoints.push({
                method: 'GET',
                path: formatNextjsPath(basePath),
                ...extractNextjsEndpointDetails(content, 'GET')
            });
        }
    }

    // Named exports for specific methods
    const namedExports = content.match(/export\s+(?:async\s+)?function\s+(get|post|put|patch|delete)\s*\(/gi) || [];
    for (const exp of namedExports) {
        const match = exp.match(/function\s+(\w+)/i);
        if (match) {
            const method = match[1].toUpperCase();
            result.endpoints.push({
                method,
                path: formatNextjsPath(basePath),
                ...extractNextjsEndpointDetails(content, method)
            });
        }
    }
}

/**
 * Extract function body
 */
function extractFunctionBody(content, startIndex) {
    let depth = 1;
    let i = startIndex;

    while (i < content.length && depth > 0) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') depth--;
        i++;
    }

    return content.substring(startIndex, i);
}

/**
 * Format Next.js path to OpenAPI format
 */
function formatNextjsPath(path) {
    // Convert [param] to {param}
    return path.replace(/\[([^\]]+)\]/g, '{$1}');
}

/**
 * Extract endpoint details from function body
 */
function extractNextjsEndpointDetails(body, method) {
    const details = {
        summary: null,
        parameters: [],
        requestBody: null,
        responses: [],
        requiresAuth: false
    };

    // Check for auth
    details.requiresAuth = /getSession|getToken|verifyToken|authenticated/i.test(body);

    // Extract query parameters
    const queryMatches = body.matchAll(/(?:searchParams|query)\.get\s*\(\s*['"`](\w+)['"`]\)/g);
    for (const match of queryMatches) {
        details.parameters.push({
            name: match[1],
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: `Query parameter: ${match[1]}`
        });
    }

    // Extract request body fields
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const bodyFields = extractBodyFields(body);
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
    if (/NextResponse\.json|Response\.json/i.test(body)) {
        details.responses.push({ code: '200', description: 'JSON response' });
    }
    if (/status:\s*(\d+)|\.status\s*\(\s*(\d+)\s*\)/g.test(body)) {
        const statusMatches = body.matchAll(/status:\s*(\d+)|\.status\s*\(\s*(\d+)\s*\)/g);
        for (const match of statusMatches) {
            const code = match[1] || match[2];
            if (!details.responses.find(r => r.code === code)) {
                details.responses.push({ code, description: getStatusDescription(code) });
            }
        }
    }
    if (details.responses.length === 0) {
        details.responses.push({ code: '200', description: 'Successful response' });
    }

    // Generate summary
    details.summary = `${method} endpoint`;

    return details;
}

/**
 * Extract body fields from content
 */
function extractBodyFields(content) {
    const fields = new Set();

    // const { field1, field2 } = await request.json()
    const destructMatch = content.match(/(?:const|let)\s*\{([^}]+)\}\s*=\s*await\s+(?:request|req)\.json\(\)/);
    if (destructMatch) {
        const fieldNames = destructMatch[1].split(',').map(f => f.trim().split(/\s*[=:]\s*/)[0].trim());
        for (const name of fieldNames) {
            if (name) fields.add(name);
        }
    }

    // body.fieldName or data.fieldName
    const accessMatches = content.matchAll(/(?:body|data)\.(\w+)/g);
    for (const match of accessMatches) {
        fields.add(match[1]);
    }

    return Array.from(fields);
}

/**
 * Get status description
 */
function getStatusDescription(code) {
    const descriptions = {
        '200': 'Successful response',
        '201': 'Created successfully',
        '400': 'Bad request',
        '401': 'Unauthorized',
        '403': 'Forbidden',
        '404': 'Not found',
        '500': 'Internal server error'
    };
    return descriptions[code] || `HTTP ${code}`;
}

/**
 * Generate OpenAPI spec from parsed Next.js file
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
            tags: [extractTagFromPath(endpoint.path)],
            parameters: endpoint.parameters,
            responses: {}
        };

        if (endpoint.requiresAuth || parseResult.hasAuth) {
            operation.security = [{ bearerAuth: [] }];
        }

        if (endpoint.requestBody) {
            operation.requestBody = endpoint.requestBody;
        }

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
            description: `API generada desde Next.js ${parseResult.isAppRouter ? '(App Router)' : '(Pages Router)'}`
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
    const parts = path.replace('/api/', '').split('/').filter(p => p && !p.startsWith('{'));
    return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'API';
}

module.exports = {
    parseNextjsFile,
    generateOpenApiSpec
};
