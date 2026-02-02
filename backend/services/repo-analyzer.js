/**
 * Repo Analyzer Service
 * Analyzes Git repositories to extract API documentation
 */

const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { parseSwaggerComments, extractSpecPreview } = require('./swagger-parser');

// Framework-specific parsers
const expressParser = require('./parsers/express-parser');
const laravelParser = require('./parsers/laravel-parser');
const symfonyParser = require('./parsers/symfony-parser');
const nextjsParser = require('./parsers/nextjs-parser');
const nodejsParser = require('./parsers/nodejs-parser');
const astParser = require('./parsers/ast-parser');

// AI Enhancement service (optional)
const geminiService = require('./gemini-service');

// Supported file extensions by framework type
const FILE_PATTERNS = {
    node: ['.js', '.ts', '.mjs'],
    php: ['.php'],
    python: ['.py']
};

// Framework detection patterns
const FRAMEWORK_PATTERNS = {
    express: {
        type: 'node',
        packageDeps: ['express'],
        codePatterns: [/\w+\.(get|post|put|delete|patch)\s*\(/g]
    },
    nestjs: {
        type: 'node',
        packageDeps: ['@nestjs/core'],
        codePatterns: [/@(Get|Post|Put|Delete|Patch)\s*\(/g, /@Controller\s*\(/g]
    },
    fastify: {
        type: 'node',
        packageDeps: ['fastify'],
        codePatterns: [/fastify\.(get|post|put|delete|patch)\s*\(/g, /\.route\s*\(\s*\{/g]
    },
    koa: {
        type: 'node',
        packageDeps: ['koa', '@koa/router', 'koa-router'],
        codePatterns: [/router\.(get|post|put|delete|patch|del)\s*\(/g]
    },
    hapi: {
        type: 'node',
        packageDeps: ['@hapi/hapi', 'hapi'],
        codePatterns: [/server\.route\s*\(\s*\{/g]
    },
    nextjs: {
        type: 'node',
        packageDeps: ['next'],
        codePatterns: [/export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/g]
    },
    laravel: {
        type: 'php',
        composerDeps: ['laravel/framework'],
        codePatterns: [/Route::(get|post|put|delete|patch)\s*\(/g, /@(Get|Post|Put|Delete)\s*\(/g]
    },
    symfony: {
        type: 'php',
        composerDeps: ['symfony/framework-bundle'],
        codePatterns: [/#\[Route\s*\(/g, /@Route\s*\(/g]
    },
    fastapi: {
        type: 'python',
        requirementsDeps: ['fastapi'],
        codePatterns: [/@app\.(get|post|put|delete|patch)\s*\(/g, /@router\.(get|post|put|delete|patch)\s*\(/g]
    },
    flask: {
        type: 'python',
        requirementsDeps: ['flask', 'Flask'],
        codePatterns: [/@app\.route\s*\(/g, /@blueprint\.route\s*\(/g]
    }
};

/**
 * Clone a repository to a temporary directory
 */
async function cloneRepository(repoUrl, branch = 'main') {
    const tempDir = path.join(os.tmpdir(), `repo-analyzer-${Date.now()}`);

    try {
        await fs.mkdir(tempDir, { recursive: true });

        const git = simpleGit();

        console.log(`Cloning ${repoUrl} to ${tempDir}...`);

        await git.clone(repoUrl, tempDir, [
            '--depth', '1',  // Shallow clone for speed
            '--branch', branch,
            '--single-branch'
        ]);

        console.log('Clone completed successfully');

        return {
            success: true,
            path: tempDir,
            message: 'Repository cloned successfully'
        };
    } catch (error) {
        // Try with 'master' if 'main' fails
        if (branch === 'main') {
            try {
                const git = simpleGit();
                await git.clone(repoUrl, tempDir, [
                    '--depth', '1',
                    '--branch', 'master',
                    '--single-branch'
                ]);
                return {
                    success: true,
                    path: tempDir,
                    branch: 'master',
                    message: 'Repository cloned successfully (master branch)'
                };
            } catch (err) {
                // Continue to error handling
            }
        }

        // Cleanup on error
        await cleanupRepo(tempDir);

        return {
            success: false,
            error: error.message,
            message: 'Failed to clone repository'
        };
    }
}

/**
 * Detect the framework used in the repository
 */
async function detectFramework(repoPath) {
    const detected = {
        frameworks: [],
        type: null,
        primary: null
    };

    try {
        // Check package.json for Node.js projects
        const packageJsonPath = path.join(repoPath, 'package.json');
        try {
            const packageContent = await fs.readFile(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageContent);
            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
            };

            for (const [framework, config] of Object.entries(FRAMEWORK_PATTERNS)) {
                if (config.packageDeps) {
                    const found = config.packageDeps.some(dep => allDeps[dep]);
                    if (found) {
                        detected.frameworks.push(framework);
                        detected.type = 'node';
                    }
                }
            }
        } catch (e) {
            // No package.json
        }

        // Check composer.json for PHP projects
        const composerPath = path.join(repoPath, 'composer.json');
        try {
            const composerContent = await fs.readFile(composerPath, 'utf8');
            const composer = JSON.parse(composerContent);
            const allDeps = {
                ...composer.require,
                ...composer['require-dev']
            };

            for (const [framework, config] of Object.entries(FRAMEWORK_PATTERNS)) {
                if (config.composerDeps) {
                    const found = config.composerDeps.some(dep => allDeps[dep]);
                    if (found) {
                        detected.frameworks.push(framework);
                        detected.type = 'php';
                    }
                }
            }
        } catch (e) {
            // No composer.json
        }

        // Check requirements.txt for Python projects
        const requirementsPath = path.join(repoPath, 'requirements.txt');
        try {
            const requirements = await fs.readFile(requirementsPath, 'utf8');

            for (const [framework, config] of Object.entries(FRAMEWORK_PATTERNS)) {
                if (config.requirementsDeps) {
                    const found = config.requirementsDeps.some(dep =>
                        requirements.toLowerCase().includes(dep.toLowerCase())
                    );
                    if (found) {
                        detected.frameworks.push(framework);
                        detected.type = 'python';
                    }
                }
            }
        } catch (e) {
            // No requirements.txt
        }

        // Set primary framework
        if (detected.frameworks.length > 0) {
            detected.primary = detected.frameworks[0];
        }

    } catch (error) {
        console.error('Error detecting framework:', error);
    }

    return detected;
}

/**
 * Scan repository for API-related files
 */
async function scanForApiFiles(repoPath, framework = null) {
    const apiFiles = [];
    const frameworkType = framework ? FRAMEWORK_PATTERNS[framework]?.type : null;

    // Determine which extensions to look for
    let extensions = [];
    if (frameworkType) {
        extensions = FILE_PATTERNS[frameworkType] || [];
    } else {
        // Look for all supported extensions
        extensions = [...FILE_PATTERNS.node, ...FILE_PATTERNS.php, ...FILE_PATTERNS.python];
    }

    // Directories to scan (prioritize common API locations)
    const priorityDirs = [
        'routes', 'api', 'controllers', 'src/routes', 'src/api', 'src/controllers',
        'app/Http/Controllers', 'app/routes',  // Laravel
        'src/Controller',  // Symfony
        'app/api', 'pages/api',  // Next.js
        'routers', 'endpoints'  // Python
    ];

    // Directories to skip
    const skipDirs = ['node_modules', 'vendor', '.git', 'dist', 'build', '__pycache__', '.next'];

    async function scanDir(dirPath, depth = 0) {
        if (depth > 5) return; // Max depth

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = path.relative(repoPath, fullPath);

                if (entry.isDirectory()) {
                    if (!skipDirs.includes(entry.name)) {
                        await scanDir(fullPath, depth + 1);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (extensions.includes(ext)) {
                        // Check if file might contain API definitions
                        const content = await fs.readFile(fullPath, 'utf8');
                        const analysis = analyzeFileContent(content, framework);

                        if (analysis.isApiFile || analysis.hasSwaggerComments) {
                            apiFiles.push({
                                path: relativePath,
                                fullPath,
                                extension: ext,
                                size: (await fs.stat(fullPath)).size,
                                ...analysis
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error scanning ${dirPath}:`, error.message);
        }
    }

    // First scan priority directories
    for (const dir of priorityDirs) {
        const dirPath = path.join(repoPath, dir);
        try {
            await fs.access(dirPath);
            await scanDir(dirPath);
        } catch (e) {
            // Directory doesn't exist
        }
    }

    // If no files found, scan the whole repo
    if (apiFiles.length === 0) {
        await scanDir(repoPath);
    }

    return apiFiles;
}

/**
 * Analyze file content for API patterns
 */
function analyzeFileContent(content, framework = null) {
    const result = {
        isApiFile: false,
        hasSwaggerComments: false,
        endpointsCount: 0,
        endpoints: [],
        swaggerBlocks: 0
    };

    // Check for Swagger/JSDoc comments
    const swaggerPattern = /@swagger|@openapi|\* @swagger|\* @openapi/gi;
    const swaggerMatches = content.match(swaggerPattern);
    if (swaggerMatches) {
        result.hasSwaggerComments = true;
        result.swaggerBlocks = swaggerMatches.length;
    }

    // Check for route definitions based on framework - just check if it's an API file
    const patternsToCheck = framework
        ? [FRAMEWORK_PATTERNS[framework]?.codePatterns].filter(Boolean).flat()
        : Object.values(FRAMEWORK_PATTERNS).flatMap(f => f.codePatterns || []);

    for (const pattern of patternsToCheck) {
        if (pattern.test(content)) {
            result.isApiFile = true;
            break;  // Just need to know if it's an API file, don't count here
        }
    }

    // Extract unique endpoints using Set to avoid duplicates
    const seenEndpoints = new Set();
    const routePatterns = [
        // Match any object calling standard HTTP methods (e.g. app.get, router.post, api.put, etc.)
        /\w+\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /Route::(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /fastify\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi
    ];

    for (const pattern of routePatterns) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const path = match[2];
            const key = `${method}:${path}`;

            if (!seenEndpoints.has(key)) {
                seenEndpoints.add(key);
                result.endpoints.push({
                    method,
                    path
                });
            }
        }
    }

    result.endpointsCount = result.endpoints.length;
    if (result.endpointsCount > 0) {
        result.isApiFile = true;
    }

    return result;
}

/**
 * Get global project context
 */
async function getProjectContext(repoPath, framework) {
    const context = {
        name: path.basename(repoPath),
        framework: framework || 'Unknown',
        dependencies: [],
        structure: 'Standard'
    };

    try {
        // Read package.json if it exists
        const packageJsonPath = path.join(repoPath, 'package.json');
        try {
            const content = await fs.readFile(packageJsonPath, 'utf8');
            const pkg = JSON.parse(content);
            context.name = pkg.name || context.name;
            context.dependencies = Object.keys(pkg.dependencies || {}).slice(0, 15);
        } catch (e) {
            // No package.json
        }

        // List key directories to understand structure
        const entries = await fs.readdir(repoPath, { withFileTypes: true });
        const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
        context.structure = dirs.join(', ');

    } catch (error) {
        console.error('Error getting project context:', error.message);
    }

    return context;
}

/**
 * Find related models for an API file to provide better context
 */
async function findRelatedModels(repoPath, framework, apiFilePath, imports = []) {
    const models = [];
    const modelDirs = ['models', 'entities', 'schemas', 'src/models', 'app/Models', 'app/Entities'];

    try {
        // Extract potential model names from imports (e.g. '../models/User' -> 'User')
        const importedNames = imports.map(imp => {
            const parts = imp.split('/');
            return parts[parts.length - 1].replace(/\.(js|ts|php)$/, '');
        });

        for (const dir of modelDirs) {
            const fullDir = path.join(repoPath, dir);
            try {
                await fs.access(fullDir);
                const files = await fs.readdir(fullDir);
                for (const file of files) {
                    const fileNameNoExt = file.replace(/\.(js|ts|php)$/, '');

                    // Prioritize if it matches an import
                    const isImported = importedNames.some(name =>
                        name.toLowerCase() === fileNameNoExt.toLowerCase()
                    );

                    if (isImported || (models.length < 5)) { // Always add imported, fallback to first 5
                        const content = await fs.readFile(path.join(fullDir, file), 'utf8');

                        // Avoid duplicates
                        if (!models.find(m => m.name === file)) {
                            models.push({
                                name: file,
                                content: content.substring(0, 3000), // Increased to 3KB for more complex models
                                prioritized: isImported
                            });
                        }
                    }
                }
            } catch (e) {
                // Directory doesn't exist
            }
        }
    } catch (error) {
        console.error('Error finding models:', error.message);
    }

    // Sort to put prioritized models first
    return models.sort((a, b) => (b.prioritized ? 1 : 0) - (a.prioritized ? 1 : 0)).slice(0, 8);
}

/**
 * Parse a file and extract/generate OpenAPI spec
 */
async function parseFile(filePath, framework = null, repoPath = null, globalContext = null) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const fileName = path.basename(filePath);

        // Detect imports for finding related models
        const importMatches = content.matchAll(/(?:require|import|use)\s*[\(\{]?\s*['"`]([^'"`]+)['"`]/g);
        const fileImports = Array.from(importMatches).map(m => m[1]);

        const analysis = analyzeFileContent(content, framework);

        // Enhance context with related models if repoPath is provided
        let extendedContext = '';
        if (repoPath) {
            const relatedModels = await findRelatedModels(repoPath, framework, filePath, fileImports);
            if (relatedModels.length > 0) {
                extendedContext = "\nESTRUCTURAS DE DATOS/MODELOS DETECTADOS EN EL PROYECTO:\n";
                relatedModels.forEach(m => {
                    extendedContext += `\n--- Model: ${m.name} ${m.prioritized ? '(Importado en este archivo)' : ''} ---\n${m.content}\n`;
                });
            }
        }

        // PRIORITY 1: Use framework-specific parser with AI enhancement (if available)
        if (framework && analysis.isApiFile) {
            try {
                const frameworkSpec = await parseWithFrameworkParser(content, filePath, framework);
                if (frameworkSpec && frameworkSpec.success) {
                    // Enhance with AI if available (with rich context)
                    if (geminiService.isGeminiAvailable()) {
                        try {
                            // Inject related models context into endpoints for the AI
                            const endpointsWithContext = frameworkSpec.endpoints.map(e => ({
                                ...e,
                                context: (e.context || content) + extendedContext
                            }));

                            const enhanced = await geminiService.enhanceSpecWithAI(
                                frameworkSpec.spec,
                                { endpoints: endpointsWithContext },
                                globalContext
                            );
                            return {
                                ...frameworkSpec,
                                method: `${frameworkSpec.method}+AI`,
                                spec: enhanced,
                                aiEnhanced: true
                            };
                        } catch (aiErr) {
                            console.error('AI Enhancement failed:', aiErr.message);
                        }
                    }
                    return frameworkSpec;
                }
            } catch (err) {
                console.error(`Error with ${framework} parser:`, err);
            }
        }

        // PRIORITY 2: Generate spec from detected endpoints with AI enhancement (if available)
        if (analysis.endpoints.length > 0) {
            const inferredSpec = generateInferredSpec(analysis.endpoints, fileName);

            // Enhance with AI if available
            let finalSpec = inferredSpec;
            let aiEnhanced = false;
            if (geminiService.isGeminiAvailable()) {
                try {
                    const gemini = require('./gemini-service');
                    // Add extended context to endpoints for AI
                    const endpointsWithContext = analysis.endpoints.map(e => ({
                        ...e,
                        context: content + extendedContext
                    }));

                    finalSpec = await gemini.enhanceSpecWithAI(
                        inferredSpec,
                        { endpoints: endpointsWithContext },
                        globalContext
                    );
                    aiEnhanced = true;
                } catch (err) {
                    console.error('AI enhancement for inferred spec failed:', err.message);
                }
            }

            return {
                success: true,
                method: `inferred${aiEnhanced ? '+AI' : ''}`,
                spec: finalSpec,
                preview: extractSpecPreview(finalSpec),
                qualityScore: calculateQualityScore(finalSpec),
                endpoints: analysis.endpoints,
                aiEnhanced,
                message: `Inferred ${analysis.endpoints.length} endpoints${aiEnhanced ? ' (AI enhanced)' : ''}`
            };
        }

        // PRIORITY 3 (FALLBACK): Use Swagger comments only if AI is not available or no endpoints detected
        // This ensures pre-established comments are only used as a last resort
        if (analysis.hasSwaggerComments) {
            try {
                const result = parseSwaggerComments(content, fileName);
                const preview = extractSpecPreview(result.spec);

                return {
                    success: true,
                    method: 'swagger-comments',
                    spec: result.spec,
                    preview,
                    qualityScore: calculateQualityScore(result.spec),
                    message: `Parsed ${result.pathsCount} paths from Swagger comments (fallback)`
                };
            } catch (err) {
                console.error('Error parsing Swagger comments:', err);
            }
        }

        return {
            success: false,
            message: 'No API endpoints found in file'
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: 'Failed to parse file'
        };
    }
}

/**
 * Parse with framework-specific parser
 */
async function parseWithFrameworkParser(content, filePath, framework) {
    const fileName = path.basename(filePath);
    let parseResult, spec;

    switch (framework) {
        case 'express': {
            // Try AST parser first for more accuracy
            const astResult = astParser.parseWithAST(content, filePath);
            if (astResult && astResult.endpoints.length > 0) {
                parseResult = astResult;
                spec = astParser.generateOpenApiSpec(astResult, fileName);
            } else {
                // Fallback to regex parser
                parseResult = expressParser.parseExpressFile(content, filePath);
                if (parseResult.endpoints.length > 0) {
                    spec = expressParser.generateOpenApiSpec(parseResult, fileName);
                }
            }
            break;
        }

        case 'laravel':
            parseResult = laravelParser.parseLaravelFile(content, filePath);
            if (parseResult.endpoints.length > 0) {
                spec = laravelParser.generateOpenApiSpec(parseResult, fileName);
            }
            break;

        case 'symfony':
            parseResult = symfonyParser.parseSymfonyFile(content, filePath);
            if (parseResult.endpoints.length > 0) {
                spec = symfonyParser.generateOpenApiSpec(parseResult, fileName);
            }
            break;

        case 'nextjs':
            parseResult = nextjsParser.parseNextjsFile(content, filePath);
            if (parseResult.endpoints.length > 0) {
                spec = nextjsParser.generateOpenApiSpec(parseResult, fileName);
            }
            break;

        case 'fastify':
        case 'koa':
        case 'hapi':
            parseResult = nodejsParser.parseNodejsFile(content, filePath);
            if (parseResult.endpoints.length > 0) {
                spec = nodejsParser.generateOpenApiSpec(parseResult, fileName);
            }
            break;

        default:
            return null;
    }

    if (spec && Object.keys(spec.paths || {}).length > 0) {
        const endpointsCount = parseResult?.endpoints?.length || 0;

        // HEURISTIC: If no servers defined, try to infer from filename
        // This solves the issue for framework-parsed files without explicit mount info (e.g. auth.js -> /auth)
        if (!spec.servers || spec.servers.length === 0) {
            const baseName = path.basename(filePath, path.extname(filePath));
            // Only apply for files in typical route directories
            if (filePath.includes('routes') || filePath.includes('api') || filePath.includes('controllers')) {
                // Ignore generic names like 'index', 'server', 'app', 'routes', 'api'
                if (!['index', 'server', 'app', 'routes', 'api', 'main'].includes(baseName.toLowerCase())) {
                    spec.servers = [{
                        url: `/${baseName}`,
                        description: `Auto-inferred server from filename (${baseName})`
                    }];
                }
            }
        }

        // Enhance with AI if available
        let enhancedSpec = spec;
        let aiEnhanced = false;
        if (geminiService.isGeminiAvailable()) {
            try {
                enhancedSpec = await geminiService.enhanceSpecWithAI(spec, parseResult);
                aiEnhanced = true;
            } catch (err) {
                console.error('AI enhancement failed, using standard spec:', err.message);
            }
        }

        return {
            success: true,
            method: `${framework}-parser${aiEnhanced ? '+AI' : ''}`,
            spec: enhancedSpec,
            preview: extractSpecPreview(enhancedSpec),
            qualityScore: calculateQualityScore(enhancedSpec),
            endpoints: parseResult?.endpoints || [],
            hasAuth: parseResult?.hasAuth || false,
            aiEnhanced,
            message: `Parsed ${endpointsCount} endpoints using ${framework} parser${aiEnhanced ? ' (AI enhanced)' : ''}`
        };
    }

    return null;
}

/**
 * Generate an inferred OpenAPI spec from detected endpoints
 */
function generateInferredSpec(endpoints, fileName) {
    // Import example generator
    const { generateEndpointExamples } = require('./parsers/example-generator');

    const paths = {};

    for (const endpoint of endpoints) {
        const pathKey = endpoint.path.replace(/:(\w+)/g, '{$1}'); // Convert :param to {param}

        if (!paths[pathKey]) {
            paths[pathKey] = {};
        }

        const methodLower = endpoint.method.toLowerCase();
        const methodUpper = endpoint.method.toUpperCase();

        // Generate examples for this endpoint
        const examples = generateEndpointExamples(
            methodUpper,
            endpoint.path,
            [], // No request fields detected
            [], // No response fields detected
            []  // No status codes detected
        );

        // Determine success code
        const successCode = methodUpper === 'POST' ? '201' : '200';

        // Build responses with examples
        const responses = {};
        responses[successCode] = {
            description: methodUpper === 'POST' ? 'Recurso creado exitosamente' : 'Operación exitosa',
            content: {
                'application/json': {
                    schema: { type: 'object' },
                    example: examples.responses[successCode] || {}
                }
            }
        };

        // Add error responses
        for (const [code, exampleData] of Object.entries(examples.responses)) {
            if (code !== successCode && code !== '200' && code !== '201') {
                responses[code] = {
                    description: getErrorDescription(code),
                    content: {
                        'application/json': {
                            schema: { type: 'object', properties: { error: { type: 'string' } } },
                            example: exampleData
                        }
                    }
                };
            }
        }

        // Extract resource name for better summary
        const resourceName = extractResourceFromPath(endpoint.path);
        const actionMap = {
            GET: endpoint.path.includes(':') ? 'Obtener' : 'Listar',
            POST: 'Crear',
            PUT: 'Actualizar',
            PATCH: 'Actualizar parcialmente',
            DELETE: 'Eliminar'
        };

        paths[pathKey][methodLower] = {
            summary: `${actionMap[methodUpper] || methodUpper} ${resourceName}`,
            description: `Endpoint para ${(actionMap[methodUpper] || methodUpper).toLowerCase()} ${resourceName}`,
            tags: [capitalizeFirst(resourceName)],
            parameters: extractPathParams(endpoint.path),
            responses
        };

        // Add request body for POST/PUT/PATCH with example
        if (['post', 'put', 'patch'].includes(methodLower)) {
            paths[pathKey][methodLower].requestBody = {
                description: `Datos para ${methodLower === 'post' ? 'crear' : 'actualizar'} ${resourceName}`,
                required: true,
                content: {
                    'application/json': {
                        schema: { type: 'object' },
                        example: examples.request || { name: 'Valor de ejemplo' }
                    }
                }
            };
        }
    }

    return {
        openapi: '3.0.0',
        info: {
            title: `API from ${fileName}`,
            version: '1.0.0',
            description: 'API specification generated from code analysis'
        },
        servers: inferServersFromFileName(fileName),
        paths
    };
}

/**
 * Infer servers configuration from filename
 * @param {string} fileName 
 */
function inferServersFromFileName(fileName) {
    if (!fileName) return [];

    const baseName = path.basename(fileName, path.extname(fileName));

    // Ignore generic names
    if (['index', 'server', 'app', 'routes', 'api', 'main'].includes(baseName.toLowerCase())) {
        return [];
    }

    return [{
        url: `/${baseName}`,
        description: `Auto-inferred server from filename (${baseName})`
    }];
}

/**
 * Get error description by code
 */
function getErrorDescription(code) {
    const descriptions = {
        '400': 'Solicitud inválida',
        '401': 'No autenticado',
        '403': 'Acceso denegado',
        '404': 'Recurso no encontrado',
        '409': 'Conflicto',
        '500': 'Error interno del servidor'
    };
    return descriptions[code] || `Error HTTP ${code}`;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : 'API';
}

/**
 * Extract resource name from path
 */
function extractResourceFromPath(path) {
    const parts = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
    const resource = parts[parts.length - 1] || parts[0] || 'recurso';
    // Singularize if ends with 's'
    return resource.endsWith('s') && !resource.endsWith('ss') ? resource.slice(0, -1) : resource;
}

/**
 * Extract path parameters from route path
 */
function extractPathParams(routePath) {
    const params = [];
    const paramRegex = /:(\w+)/g;
    let match;

    while ((match = paramRegex.exec(routePath)) !== null) {
        params.push({
            name: match[1],
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: `[TODO] Describe ${match[1]} parameter`
        });
    }

    return params;
}

/**
 * Calculate quality score for a spec (0-100) with detailed breakdown
 */
function calculateQualityScore(spec, detailed = false) {
    const breakdown = {
        routes: { score: 0, max: 20, label: 'Rutas detectadas', icon: '🛤️' },
        descriptions: { score: 0, max: 20, label: 'Descripciones', icon: '📝' },
        parameters: { score: 0, max: 15, label: 'Parámetros', icon: '🔧' },
        responses: { score: 0, max: 15, label: 'Respuestas', icon: '📤' },
        examples: { score: 0, max: 10, label: 'Ejemplos', icon: '💡' },
        schemas: { score: 0, max: 10, label: 'Schemas', icon: '📋' },
        info: { score: 0, max: 10, label: 'Info completa', icon: 'ℹ️' }
    };

    const suggestions = [];
    const paths = spec.paths || {};
    const pathCount = Object.keys(paths).length;

    // Routes (20 points)
    if (pathCount > 0) {
        breakdown.routes.score = 20;
    } else {
        suggestions.push('Añadir endpoints a la especificación');
    }

    if (pathCount > 0) {
        let descriptionsCount = 0;
        let parametersCount = 0;
        let responsesCount = 0;
        let examplesCount = 0;
        let totalOperations = 0;
        let missingDescriptions = 0;
        let missingResponses = 0;

        for (const pathKey of Object.keys(paths)) {
            const pathItem = paths[pathKey];
            for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
                if (pathItem[method]) {
                    totalOperations++;
                    const operation = pathItem[method];

                    // Has description (not TODO)
                    if (operation.description && !operation.description.includes('[TODO]')) {
                        descriptionsCount++;
                    } else if (operation.summary && !operation.summary.includes('[TODO]')) {
                        descriptionsCount++;
                    } else {
                        missingDescriptions++;
                    }

                    // Has parameters documented
                    if (operation.parameters && operation.parameters.length > 0) {
                        const documented = operation.parameters.filter(p =>
                            p.description && !p.description.includes('[TODO]')
                        );
                        if (documented.length > 0) {
                            parametersCount++;
                        }
                    }

                    // Has response schemas
                    if (operation.responses) {
                        const hasSchema = Object.values(operation.responses).some(r =>
                            r.content?.['application/json']?.schema
                        );
                        if (hasSchema) {
                            responsesCount++;
                        } else {
                            missingResponses++;
                        }
                    }

                    // Has examples
                    if (operation.responses) {
                        const hasExample = Object.values(operation.responses).some(r =>
                            r.content?.['application/json']?.example ||
                            r.content?.['application/json']?.examples
                        );
                        if (hasExample) {
                            examplesCount++;
                        }
                    }
                }
            }
        }

        if (totalOperations > 0) {
            // Descriptions (20 points)
            breakdown.descriptions.score = Math.round((descriptionsCount / totalOperations) * 20);
            if (missingDescriptions > 0) {
                suggestions.push(`Añadir descripción a ${missingDescriptions} endpoint(s)`);
            }

            // Parameters (15 points)
            breakdown.parameters.score = Math.round((parametersCount / totalOperations) * 15);

            // Responses (15 points)
            breakdown.responses.score = Math.round((responsesCount / totalOperations) * 15);
            if (missingResponses > 0) {
                suggestions.push(`Documentar respuestas en ${missingResponses} endpoint(s)`);
            }

            // Examples (10 points)
            breakdown.examples.score = Math.round((examplesCount / totalOperations) * 10);
            if (examplesCount < totalOperations) {
                suggestions.push('Incluir ejemplos de request/response');
            }
        }
    }

    // Schemas (10 points)
    if (spec.components?.schemas && Object.keys(spec.components.schemas).length > 0) {
        breakdown.schemas.score = 10;
    } else {
        suggestions.push('Definir schemas reutilizables en components');
    }

    // Info complete (10 points)
    if (spec.info) {
        let infoScore = 0;
        if (spec.info.title && !spec.info.title.includes('[TODO]')) infoScore += 3;
        if (spec.info.description && !spec.info.description.includes('[TODO]')) infoScore += 4;
        if (spec.info.version) infoScore += 3;
        breakdown.info.score = infoScore;

        if (infoScore < 10) {
            suggestions.push('Completar información de la API (título, descripción, versión)');
        }
    }

    // Calculate total
    let totalScore = 0;
    let totalMax = 0;
    for (const key of Object.keys(breakdown)) {
        totalScore += breakdown[key].score;
        totalMax += breakdown[key].max;
        breakdown[key].percentage = Math.round((breakdown[key].score / breakdown[key].max) * 100);
    }

    const finalScore = Math.round((totalScore / totalMax) * 100);

    // Return detailed or simple score
    if (detailed) {
        return {
            total: finalScore,
            breakdown,
            suggestions: suggestions.slice(0, 5), // Max 5 suggestions
            level: getQualityLevel(finalScore)
        };
    }

    return finalScore;
}

/**
 * Get quality level from score
 */
function getQualityLevel(score) {
    if (score >= 71) return { level: 'good', emoji: '🟢', label: 'Documentación completa' };
    if (score >= 41) return { level: 'partial', emoji: '🟡', label: 'Documentación parcial' };
    return { level: 'basic', emoji: '🔴', label: 'Requiere documentación' };
}

/**
 * Cleanup temporary repository folder
 */
async function cleanupRepo(repoPath) {
    try {
        await fs.rm(repoPath, { recursive: true, force: true });
        console.log(`Cleaned up ${repoPath}`);
    } catch (error) {
        console.error(`Error cleaning up ${repoPath}:`, error.message);
    }
}

/**
 * Full repository analysis
 */
async function analyzeRepository(repoUrl, branch = 'main') {
    let repoPath = null;

    try {
        // Clone repository
        const cloneResult = await cloneRepository(repoUrl, branch);
        if (!cloneResult.success) {
            return cloneResult;
        }
        repoPath = cloneResult.path;

        // Detect framework
        const frameworkInfo = await detectFramework(repoPath);

        // Get global project context for AI
        const globalContext = await getProjectContext(repoPath, frameworkInfo.primary);

        // Scan for API files
        const apiFiles = await scanForApiFiles(repoPath, frameworkInfo.primary);

        // Parse each file
        const parsedFiles = [];
        for (const file of apiFiles) {
            console.log(`[Analyzer] Parsing file: ${file.path}...`);
            const parseResult = await parseFile(file.fullPath, frameworkInfo.primary, repoPath, globalContext);

            // Log parse result summary
            console.log(`[Analyzer] Parsed ${file.path}: Success=${parseResult.success}, Endpoints=${parseResult.endpoints?.length || 0}`);

            parsedFiles.push({
                ...file,
                parseResult
            });
        }

        // Calculate overall stats - use actual spec paths for accurate count
        const filesWithEndpointCounts = parsedFiles.map(f => {
            // Count actual operations from the parsed spec (more accurate)
            let actualEndpoints = 0;
            if (f.parseResult.spec?.paths) {
                for (const pathItem of Object.values(f.parseResult.spec.paths)) {
                    for (const method of ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']) {
                        if (pathItem[method]) actualEndpoints++;
                    }
                }
            }
            // Fallback to endpoints array length or original count
            if (actualEndpoints === 0 && f.parseResult.endpoints?.length) {
                actualEndpoints = f.parseResult.endpoints.length;
            }
            if (actualEndpoints === 0) {
                actualEndpoints = f.endpointsCount || 0;
            }
            return { ...f, actualEndpointsCount: actualEndpoints };
        });



        const stats = {
            totalFiles: apiFiles.length,
            filesWithSwagger: apiFiles.filter(f => f.hasSwaggerComments).length,
            totalEndpoints: filesWithEndpointCounts.reduce((sum, f) => sum + f.actualEndpointsCount, 0),
            averageQuality: parsedFiles.length > 0
                ? Math.round(parsedFiles.reduce((sum, f) => sum + (f.parseResult.qualityScore || 0), 0) / parsedFiles.length)
                : 0
        };

        return {
            success: true,
            repoUrl,
            branch: cloneResult.branch || branch,
            framework: frameworkInfo,
            files: filesWithEndpointCounts.map(f => ({
                path: f.path,
                hasSwaggerComments: f.hasSwaggerComments,
                endpointsCount: f.actualEndpointsCount, // Use accurate count
                qualityScore: f.parseResult.qualityScore,
                qualityLevel: getQualityLevel(f.parseResult.qualityScore || 0),
                method: f.parseResult.method,
                spec: f.parseResult.spec,
                preview: f.parseResult.preview
            })),
            stats,
            overallQuality: getQualityLevel(stats.averageQuality)
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: 'Repository analysis failed'
        };
    } finally {
        // Always cleanup
        if (repoPath) {
            await cleanupRepo(repoPath);
        }
    }
}

module.exports = {
    cloneRepository,
    detectFramework,
    scanForApiFiles,
    parseFile,
    analyzeRepository,
    calculateQualityScore,
    getQualityLevel,
    cleanupRepo
};
