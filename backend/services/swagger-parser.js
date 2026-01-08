/**
 * Servicio para parsear archivos JavaScript con comentarios Swagger/JSDoc
 * y generar especificaciones OpenAPI 3.0
 */

const yaml = require('js-yaml');

/**
 * Parsea código JavaScript con comentarios Swagger y genera especificación OpenAPI
 * @param {string} code - Código JavaScript con comentarios @swagger
 * @param {string} fileName - Nombre del archivo (opcional, para contexto)
 * @returns {object} - Especificación OpenAPI generada con estadísticas
 */
function parseSwaggerComments(code, fileName = 'uploaded-file.js') {
    // Configuración base de OpenAPI
    const spec = {
        openapi: '3.0.0',
        info: {
            title: `API from ${fileName}`,
            version: '1.0.0',
            description: 'API specification generated from Swagger comments',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
        ],
        paths: {},
        components: {
            schemas: {},
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'auth_token'
                }
            }
        },
        tags: []
    };

    try {
        // Extraer todos los comentarios Swagger del código
        extractSwaggerComments(code, spec);

        // Validar que se encontraron comentarios
        const pathsCount = Object.keys(spec.paths).length;
        const schemasCount = Object.keys(spec.components.schemas).length;

        if (pathsCount === 0 && schemasCount === 0) {
            throw new Error('No se encontraron comentarios Swagger válidos en el archivo. Asegúrate de usar la sintaxis /** @swagger */');
        }

        return {
            spec,
            pathsCount,
            schemasCount
        };
    } catch (error) {
        throw new Error(`Error al parsear comentarios Swagger: ${error.message}`);
    }
}

/**
 * Extrae comentarios Swagger del código y los añade a la especificación
 */
function extractSwaggerComments(code, spec) {
    // Regex para encontrar bloques de comentarios con @swagger
    const swaggerCommentRegex = /\/\*\*[\s\S]*?@swagger[\s\S]*?\*\//g;

    let match;
    const matches = [];

    // Encontrar todos los bloques de comentarios Swagger
    while ((match = swaggerCommentRegex.exec(code)) !== null) {
        matches.push(match[0]);
    }

    if (matches.length === 0) {
        return;
    }

    // Procesar cada bloque de comentarios
    matches.forEach((commentBlock, index) => {
        try {
            // Limpiar el comentario y extraer el YAML
            const yamlContent = extractYAMLFromComment(commentBlock);

            if (!yamlContent || yamlContent.trim() === '') {
                return;
            }

            // Parsear el YAML
            const parsed = yaml.load(yamlContent);

            if (!parsed) {
                return;
            }

            // Merger el contenido parseado en la especificación
            mergeSwaggerContent(spec, parsed);

        } catch (error) {
            console.error(`Error parsing Swagger comment block ${index + 1}:`, error.message);
            // Continuar con el siguiente bloque
        }
    });
}

/**
 * Extrae el contenido YAML de un bloque de comentarios Swagger
 */
function extractYAMLFromComment(commentBlock) {
    // Eliminar /** y */
    let content = commentBlock
        .replace(/^\/\*\*/, '')
        .replace(/\*\/$/, '');

    // Dividir en líneas
    const lines = content.split('\n');

    // Encontrar la línea con @swagger
    let swaggerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('@swagger')) {
            swaggerIndex = i;
            break;
        }
    }

    if (swaggerIndex === -1) {
        return '';
    }

    // Tomar todo después de @swagger
    const yamlLines = lines.slice(swaggerIndex + 1);

    // Limpiar cada línea (quitar * y espacios al inicio)
    const cleanedLines = yamlLines.map(line => {
        return line.replace(/^\s*\*\s?/, '');
    });

    return cleanedLines.join('\n').trim();
}

/**
 * Merge el contenido parseado en la especificación OpenAPI
 */
function mergeSwaggerContent(spec, parsed) {
    if (!parsed || typeof parsed !== 'object') {
        return;
    }

    // Merge paths (rutas individuales como /users, /auth/login, etc.)
    Object.keys(parsed).forEach(key => {
        if (key.startsWith('/')) {
            if (!spec.paths[key]) {
                spec.paths[key] = {};
            }
            Object.assign(spec.paths[key], parsed[key]);
        }
    });

    // Merge paths object
    if (parsed.paths) {
        Object.keys(parsed.paths).forEach(path => {
            if (!spec.paths[path]) {
                spec.paths[path] = {};
            }
            Object.assign(spec.paths[path], parsed.paths[path]);
        });
    }

    // Merge components
    if (parsed.components) {
        if (parsed.components.schemas) {
            Object.assign(spec.components.schemas, parsed.components.schemas);
        }
        if (parsed.components.securitySchemes) {
            Object.assign(spec.components.securitySchemes, parsed.components.securitySchemes);
        }
        if (parsed.components.responses) {
            if (!spec.components.responses) {
                spec.components.responses = {};
            }
            Object.assign(spec.components.responses, parsed.components.responses);
        }
        if (parsed.components.parameters) {
            if (!spec.components.parameters) {
                spec.components.parameters = {};
            }
            Object.assign(spec.components.parameters, parsed.components.parameters);
        }
    }

    // Merge tags
    if (parsed.tags) {
        if (Array.isArray(parsed.tags)) {
            parsed.tags.forEach(tag => {
                const exists = spec.tags.some(t => t.name === tag.name);
                if (!exists) {
                    spec.tags.push(tag);
                }
            });
        } else if (parsed.tags.name) {
            const exists = spec.tags.some(t => t.name === parsed.tags.name);
            if (!exists) {
                spec.tags.push(parsed.tags);
            }
        }
    }
}

/**
 * Extrae información de preview de la especificación
 */
function extractSpecPreview(spec) {
    const endpoints = Object.keys(spec.paths || {});
    const endpointsCount = endpoints.length;

    const methods = [];
    endpoints.forEach(path => {
        Object.keys(spec.paths[path]).forEach(method => {
            if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                methods.push({ path, method: method.toUpperCase() });
            }
        });
    });

    const schemas = spec.components?.schemas ? Object.keys(spec.components.schemas) : [];

    return {
        title: spec.info?.title || 'Untitled API',
        version: spec.info?.version || '1.0.0',
        endpointsCount,
        endpoints: methods.slice(0, 10), // Primeros 10 endpoints
        schemas,
        schemasCount: schemas.length
    };
}

module.exports = {
    parseSwaggerComments,
    extractSpecPreview
};
