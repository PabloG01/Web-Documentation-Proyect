/**
 * Example Generator for OpenAPI Specs
 * Generates realistic, context-aware example data for API endpoints
 */

// ============ RESOURCE TEMPLATES ============
// Complete templates for common resource types

const resourceTemplates = {
    // Authentication resources
    user: {
        single: {
            id: 1,
            username: 'juan_garcia',
            email: 'juan.garcia@ejemplo.com',
            name: 'Juan García',
            role: 'user',
            avatar_url: 'https://api.ejemplo.com/avatars/1.jpg',
            is_active: true,
            created_at: '2026-01-10T08:30:00Z',
            updated_at: '2026-01-14T15:45:00Z'
        },
        create: {
            username: 'nuevo_usuario',
            email: 'nuevo@ejemplo.com',
            password: 'contraseña_segura_123',
            name: 'Nuevo Usuario'
        },
        update: {
            name: 'Juan García Actualizado',
            email: 'juan.actualizado@ejemplo.com'
        }
    },

    auth: {
        login: {
            request: { email: 'usuario@ejemplo.com', password: 'mi_contraseña' },
            response: { id: 1, username: 'usuario', email: 'usuario@ejemplo.com', token: 'eyJhbGciOiJIUzI1NiIs...' }
        },
        register: {
            request: { username: 'nuevo_usuario', email: 'nuevo@ejemplo.com', password: 'contraseña_segura' },
            response: { id: 5, username: 'nuevo_usuario', email: 'nuevo@ejemplo.com' }
        }
    },

    // Content resources
    project: {
        single: {
            id: 1,
            code: 'PRY-2026-001',
            name: 'Sistema de Gestión Empresarial',
            description: 'Plataforma integral para la gestión de procesos empresariales incluyendo inventario, ventas y recursos humanos.',
            color: '#6366f1',
            user_id: 1,
            documents_count: 15,
            created_at: '2026-01-05T10:00:00Z',
            updated_at: '2026-01-14T12:30:00Z'
        },
        create: {
            code: 'PRY-2026-002',
            name: 'Nuevo Proyecto',
            description: 'Descripción detallada del nuevo proyecto',
            color: '#10b981'
        },
        update: {
            name: 'Proyecto Actualizado',
            description: 'Nueva descripción del proyecto'
        }
    },

    document: {
        single: {
            id: 1,
            title: 'Manual de Usuario - Sistema de Ventas',
            description: 'Guía completa para el uso del módulo de ventas',
            content: '# Manual de Usuario\n\n## Introducción\n\nEste documento describe el funcionamiento del sistema de ventas...\n\n## Funcionalidades\n\n### 1. Crear una venta\n\nPara crear una nueva venta, siga estos pasos...',
            type: 'manual',
            version: '2.1.0',
            author: 'Juan García',
            project_id: 1,
            project_name: 'Sistema de Gestión',
            user_id: 1,
            created_at: '2026-01-08T09:00:00Z',
            updated_at: '2026-01-14T11:20:00Z'
        },
        create: {
            title: 'Nuevo Documento',
            content: '# Título\n\nContenido del documento...',
            type: 'manual',
            project_id: 1
        },
        update: {
            title: 'Documento Actualizado',
            content: '# Contenido Actualizado\n\nNuevo contenido...',
            version: '2.2.0'
        }
    },

    // API/Technical resources
    api_spec: {
        single: {
            id: 1,
            name: 'API de Ventas v2.0',
            description: 'Especificación OpenAPI para el módulo de ventas',
            version: '2.0.0',
            endpoints_count: 15,
            quality_score: 85,
            project_id: 1,
            source_type: 'swagger-comments',
            created_at: '2026-01-10T14:00:00Z',
            updated_at: '2026-01-14T09:15:00Z'
        },
        create: {
            name: 'Nueva API Spec',
            description: 'Descripción de la especificación',
            spec_content: { openapi: '3.0.0', info: { title: 'API', version: '1.0.0' }, paths: {} },
            project_id: 1
        }
    },

    repo: {
        single: {
            id: 1,
            repo_name: 'backend-ventas',
            repo_url: 'https://github.com/empresa/backend-ventas',
            branch: 'main',
            detected_framework: 'express',
            is_private: false,
            files_count: 8,
            status: 'synced',
            last_sync: '2026-01-14T10:00:00Z',
            project_id: 1,
            project_name: 'Sistema de Gestión',
            created_at: '2026-01-12T16:00:00Z'
        },
        analyze: {
            request: {
                repo_url: 'https://github.com/usuario/mi-api',
                branch: 'main',
                project_id: 1,
                auth_token: 'ghp_xxxxxxxxxxxx'
            },
            response: {
                success: true,
                repo_name: 'mi-api',
                framework: { primary: 'express', confidence: 0.95 },
                files: [
                    { path: 'routes/users.js', endpoints_count: 5, quality_score: 80 },
                    { path: 'routes/products.js', endpoints_count: 4, quality_score: 75 }
                ],
                stats: { totalFiles: 2, totalEndpoints: 9, averageQuality: 78 }
            }
        }
    },

    // E-commerce resources
    product: {
        single: {
            id: 1,
            sku: 'PROD-001',
            name: 'Laptop HP Pavilion 15',
            description: 'Laptop de alto rendimiento con procesador Intel Core i7, 16GB RAM y 512GB SSD',
            price: 899.99,
            currency: 'USD',
            category: 'Electrónicos',
            stock: 50,
            is_available: true,
            image_url: 'https://api.ejemplo.com/products/laptop-hp.jpg',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-14T12:00:00Z'
        },
        create: {
            sku: 'PROD-002',
            name: 'Nuevo Producto',
            description: 'Descripción del producto',
            price: 99.99,
            category: 'General',
            stock: 100
        },
        update: {
            price: 849.99,
            stock: 45
        }
    },

    order: {
        single: {
            id: 1,
            order_number: 'ORD-2026-00001',
            status: 'completed',
            customer_id: 1,
            customer_name: 'María López',
            items: [
                { product_id: 1, name: 'Laptop HP', quantity: 1, unit_price: 899.99, subtotal: 899.99 },
                { product_id: 5, name: 'Mouse Logitech', quantity: 2, unit_price: 29.99, subtotal: 59.98 }
            ],
            subtotal: 959.97,
            tax: 153.60,
            total: 1113.57,
            payment_method: 'credit_card',
            shipping_address: 'Av. Principal 123, Ciudad',
            created_at: '2026-01-14T10:30:00Z',
            completed_at: '2026-01-14T14:00:00Z'
        },
        create: {
            customer_id: 1,
            items: [
                { product_id: 1, quantity: 1 },
                { product_id: 5, quantity: 2 }
            ],
            payment_method: 'credit_card',
            shipping_address: 'Av. Principal 123, Ciudad'
        }
    },

    // Generic fallback
    item: {
        single: {
            id: 1,
            name: 'Elemento de ejemplo',
            description: 'Descripción del elemento',
            status: 'active',
            created_at: '2026-01-14T12:00:00Z',
            updated_at: '2026-01-14T12:00:00Z'
        },
        create: {
            name: 'Nuevo elemento',
            description: 'Descripción'
        },
        update: {
            name: 'Elemento actualizado'
        }
    }
};

// Resource name mappings (plural -> singular, variations)
const resourceMappings = {
    users: 'user',
    usuarios: 'user',
    accounts: 'user',
    cuentas: 'user',
    profiles: 'user',
    perfiles: 'user',

    projects: 'project',
    proyectos: 'project',

    documents: 'document',
    documentos: 'document',
    docs: 'document',

    products: 'product',
    productos: 'product',
    items: 'product',
    articulos: 'product',

    orders: 'order',
    pedidos: 'order',
    ventas: 'order',
    sales: 'order',

    repos: 'repo',
    repositories: 'repo',
    repositorios: 'repo',

    specs: 'api_spec',
    'api-specs': 'api_spec',
    specifications: 'api_spec',

    login: 'auth',
    register: 'auth',
    signup: 'auth',
    signin: 'auth',
    authentication: 'auth'
};

/**
 * Detect resource type from path
 */
function detectResourceType(path) {
    const parts = path.toLowerCase().split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));

    for (const part of parts) {
        // Check direct mappings
        if (resourceMappings[part]) {
            return resourceMappings[part];
        }
        // Check if it matches a template key
        if (resourceTemplates[part]) {
            return part;
        }
        // Check singular form
        const singular = part.endsWith('s') ? part.slice(0, -1) : part;
        if (resourceTemplates[singular]) {
            return singular;
        }
    }

    return 'item'; // fallback
}

const FIELD_EXAMPLES = {
    id: 1, user_id: 1, project_id: 1, document_id: 1, order_id: 1, product_id: 1,
    username: 'juan_garcia', email: 'usuario@ejemplo.com', password: '********',
    name: 'Nombre de ejemplo', title: 'Título de ejemplo',
    description: 'Descripción detallada del recurso',
    content: '# Contenido\n\nTexto de ejemplo...',
    price: 99.99, amount: 150.00, total: 250.00, quantity: 5, stock: 100,
    status: 'active', type: 'general', role: 'user',
    url: 'https://ejemplo.com/recurso', image_url: 'https://ejemplo.com/imagen.jpg',
    created_at: '2026-01-14T12:00:00Z', updated_at: '2026-01-14T15:30:00Z',
    is_active: true, enabled: true, is_private: false
};

/**
 * Generate example value for a field based on its name and type
 */
function generateExampleValue(fieldName, fieldType = 'string') {
    const nameLower = fieldName.toLowerCase();

    if (FIELD_EXAMPLES[fieldName] !== undefined) return FIELD_EXAMPLES[fieldName];

    // Pattern matching
    if (nameLower.includes('email')) return 'usuario@ejemplo.com';
    if (nameLower.includes('password')) return '********';
    if (nameLower.includes('name')) return 'Nombre de ejemplo';
    if (nameLower.includes('price') || nameLower.includes('amount')) return 99.99;
    if (nameLower.includes('date') || nameLower.includes('_at')) return '2026-01-14T12:00:00Z';
    if (nameLower.includes('url')) return 'https://ejemplo.com/recurso';
    if (nameLower.includes('phone') || nameLower.includes('tel')) return '+1-555-0123';
    if (nameLower.includes('address') || nameLower.includes('direccion')) return 'Av. Principal 123, Ciudad Tecnológica';
    if (nameLower.includes('city') || nameLower.includes('ciudad')) return 'Madrid';
    if (nameLower.includes('country') || nameLower.includes('pais')) return 'España';
    if (nameLower.includes('zip') || nameLower.includes('postal')) return '28001';
    if (nameLower.includes('state') || nameLower.includes('provincia')) return 'Madrid';
    if (nameLower.includes('company') || nameLower.includes('empresa')) return 'Tech Solutions S.L.';
    if (nameLower.includes('website') || nameLower.includes('web')) return 'https://www.techsolutions.com';
    if (nameLower.includes('avatar') || nameLower.includes('photo')) return 'https://i.pravatar.cc/150?u=1';
    if (nameLower.includes('bio') || nameLower.includes('about')) return 'Ingeniero de software apasionado por la tecnología.';
    if (nameLower.includes('id')) return 1;

    // Type-based
    if (fieldType === 'integer' || fieldType === 'number') return 1;
    if (fieldType === 'boolean') return true;
    if (fieldType === 'array') return [];

    return 'valor_ejemplo';
}

/**
 * Generate request body example
 */
function generateRequestBodyExample(fields, resourceType = 'item', action = 'create') {
    // If we have detected fields, use them with smart values
    if (fields && fields.length > 0) {
        const example = {};
        for (const field of fields) {
            example[field.name] = generateExampleValue(field.name, field.type);
        }
        return example;
    }

    // Otherwise use resource template
    const template = resourceTemplates[resourceType];
    if (template) {
        if (action === 'update' && template.update) return { ...template.update };
        if (template.create) return { ...template.create };
        if (template[action]?.request) return { ...template[action].request };
    }

    return { name: 'Nuevo recurso', description: 'Descripción' };
}

/**
 * Generate success response example
 */
function generateSuccessResponseExample(method, path, fields = []) {
    const resourceType = detectResourceType(path);
    const template = resourceTemplates[resourceType];
    const hasId = path.includes(':') || path.includes('{');

    switch (method) {
        case 'GET':
            if (hasId) {
                // Single resource - use complete template
                if (template?.single) {
                    return { ...template.single };
                }
                // Build from fields if available
                const obj = { id: 1 };
                for (const f of fields) obj[f.name] = generateExampleValue(f.name, f.type);
                return obj;
            } else {
                // List with pagination
                const singleItem = template?.single || { id: 1, name: 'Elemento' };
                return {
                    data: [
                        { ...singleItem, id: 1 },
                        { ...singleItem, id: 2, name: `${singleItem.name || 'Elemento'} 2` }
                    ],
                    pagination: {
                        currentPage: 1,
                        totalPages: 5,
                        totalItems: 47,
                        itemsPerPage: 10,
                        hasNextPage: true,
                        hasPrevPage: false
                    }
                };
            }

        case 'POST':
            // Check for special actions (login, register, analyze)
            const pathLower = path.toLowerCase();
            if (pathLower.includes('login') && template?.login?.response) {
                return { ...template.login.response };
            }
            if (pathLower.includes('register') && template?.register?.response) {
                return { ...template.register.response };
            }
            if (pathLower.includes('analyze') && template?.analyze?.response) {
                return { ...template.analyze.response };
            }

            // Standard create response
            if (template?.single) {
                return { ...template.single, id: 3, created_at: '2026-01-14T12:00:00Z' };
            }
            return { id: 3, message: 'Recurso creado exitosamente', created_at: '2026-01-14T12:00:00Z' };

        case 'PUT':
        case 'PATCH':
            if (template?.single) {
                return { ...template.single, updated_at: '2026-01-14T15:30:00Z' };
            }
            return { id: 1, message: 'Recurso actualizado exitosamente', updated_at: '2026-01-14T15:30:00Z' };

        case 'DELETE':
            const resourceName = extractResourceName(path);
            return {
                success: true,
                message: `${capitalizeFirst(resourceName)} eliminado exitosamente`
            };

        default:
            return template?.single || { id: 1, status: 'ok' };
    }
}

const ERROR_MESSAGES = {
    '400': {
        error: 'Error de validación',
        details: [
            { field: 'email', message: 'El formato del email no es válido' },
            { field: 'password', message: 'La contraseña debe tener al menos 6 caracteres' }
        ]
    },
    '401': {
        error: 'No autenticado',
        message: 'Debe iniciar sesión para acceder a este recurso'
    },
    '403': {
        error: 'Acceso denegado',
        message: 'No tiene permisos para modificar este recurso'
    },
    '404': {
        error: 'No encontrado',
        message: 'El recurso solicitado no existe'
    },
    '409': {
        error: 'Conflicto',
        message: 'Ya existe un recurso con estos datos'
    },
    '422': {
        error: 'Datos inválidos',
        message: 'No se pudo procesar la solicitud con los datos proporcionados'
    },
    '429': {
        error: 'Límite excedido',
        message: 'Demasiadas solicitudes. Intente nuevamente en 60 segundos'
    },
    '500': {
        error: 'Error interno',
        message: 'Ha ocurrido un error inesperado. Por favor, intente más tarde'
    }
};

/**
 * Generate error response examples
 */
function generateErrorResponseExamples(method, path, statusCodes = []) {
    const resourceName = extractResourceName(path);
    const hasId = path.includes(':') || path.includes('{');
    const examples = {};

    // Determine relevant errors
    const relevantErrors = new Set(['500', '401']);

    switch (method) {
        case 'GET':
            if (hasId) relevantErrors.add('404');
            break;
        case 'POST':
            relevantErrors.add('400');
            relevantErrors.add('409');
            break;
        case 'PUT':
        case 'PATCH':
            relevantErrors.add('400');
            relevantErrors.add('404');
            relevantErrors.add('403');
            break;
        case 'DELETE':
            relevantErrors.add('404');
            relevantErrors.add('403');
            break;
    }

    statusCodes.forEach(c => relevantErrors.add(c));

    for (const code of relevantErrors) {
        if (ERROR_MESSAGES[code]) {
            // Customize message if needed
            const error = { ...ERROR_MESSAGES[code] };

            if (code === '403') {
                error.message = `No tiene permisos para modificar este ${resourceName}`;
            } else if (code === '404') {
                error.message = `${capitalizeFirst(resourceName)} con el ID especificado no existe`;
            } else if (code === '409') {
                error.message = `Ya existe un ${resourceName} con estos datos`;
            }

            examples[code] = error;
        }
    }

    return examples;
}

/**
 * Extract resource name from path
 */
function extractResourceName(path) {
    const parts = path.split('/').filter(p => p && !p.startsWith(':') && !p.startsWith('{'));
    const resource = parts[parts.length - 1] || parts[0] || 'recurso';
    return resource.endsWith('s') && !resource.endsWith('ss') ? resource.slice(0, -1) : resource;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/**
 * Generate complete examples for an endpoint
 */
function generateEndpointExamples(method, path, requestFields = [], responseFields = [], detectedStatusCodes = []) {
    const resourceType = detectResourceType(path);
    const action = method === 'PUT' || method === 'PATCH' ? 'update' : 'create';

    const examples = {
        request: null,
        responses: {}
    };

    // Generate request body example
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        examples.request = generateRequestBodyExample(requestFields, resourceType, action);
    }

    // Generate success response
    const successCode = method === 'POST' ? '201' : '200';
    examples.responses[successCode] = generateSuccessResponseExample(method, path, responseFields);

    // Generate error responses
    const errorExamples = generateErrorResponseExamples(method, path, detectedStatusCodes);
    examples.responses = { ...examples.responses, ...errorExamples };

    return examples;
}

module.exports = {
    generateExampleValue,
    generateRequestBodyExample,
    generateSuccessResponseExample,
    generateErrorResponseExamples,
    generateEndpointExamples,
    extractResourceName,
    capitalizeFirst,
    detectResourceType,
    resourceTemplates
};
