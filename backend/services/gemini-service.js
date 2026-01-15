/**
 * Gemini AI Service
 * Integration with Google Gemini API for intelligent API documentation generation
 */

const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini client (will be null if no API key)
let geminiClient = null;

// System Instruction for Gemini 1.5
const SYSTEM_INSTRUCTIONS = `Eres un experto arquitecto de software y especialista en documentación de APIs OpenAPI 3.0.
Tu objetivo es generar documentación técnica precisa, profesional y en español basada en el análisis de código fuente.

REGLAS DE ORO:
1. Responde ÚNICAMENTE con el objeto JSON solicitado. No incluyas explicaciones, markdown o bloques de código fuera del JSON.
2. Los ejemplos deben ser realistas y seguir convenciones de la industria (ej: fechas en ISO 8601, IDs coherentes).
3. Si el código sugiere autenticación, incluye ejemplos de cabeceras Authorization.
4. Las descripciones deben ser claras, concisas y en voz activa.
5. Usa terminología técnica correcta en español (ej: "Solicitud", "Respuesta", "Cuerpo de la petición").`;

/**
 * Initialize Gemini client with API key
 */
function initializeGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        try {
            geminiClient = new GoogleGenAI({ apiKey });
            console.log('✅ Gemini AI initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Gemini:', error.message);
            return false;
        }
    }
    console.log('ℹ️ GEMINI_API_KEY not configured - AI features disabled');
    return false;
}

/**
 * Check if Gemini is available
 */
function isGeminiAvailable() {
    return geminiClient !== null;
}

/**
 * Generate API examples using Gemini AI
 * @param {Object} endpointInfo - Information about the endpoint
 * @param {string} codeContext - Surrounding code for context
 * @param {Object} globalContext - Project level context (package.json, stats)
 * @returns {Promise<Object>} Generated examples
 */
async function generateApiExamples(endpointInfo, codeContext = '', globalContext = null) {
    if (!geminiClient) {
        return null;
    }

    const model = geminiClient.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTIONS
    });

    const projectContextStr = globalContext ? `
CONTEXTO DEL PROYECTO:
- Nombre: ${globalContext.name || 'Desconocido'}
- Framework: ${globalContext.framework || 'Node.js'}
- Dependencias clave: ${globalContext.dependencies?.join(', ') || 'N/A'}
- Estructura: ${globalContext.structure || 'N/A'}` : '';

    const prompt = `Analiza este endpoint y genera una documentación completa con ejemplos.

${projectContextStr}

DETALLES DEL ENDPOINT:
- Método: ${endpointInfo.method}
- Path: ${endpointInfo.path}
- Resumen previo: ${endpointInfo.summary || 'N/A'}
- Parámetros: ${JSON.stringify(endpointInfo.parameters || [])}
- Schema Detectado: ${JSON.stringify(endpointInfo.requestBody?.content?.['application/json']?.schema || {})}

CÓDIGO FUENTE RELACIONADO:
\`\`\`javascript
${codeContext.substring(0, 3000)}
\`\`\`

Genera un JSON con esta estructura:
{
    "summary": "Resumen profesional (máx 50 caracteres)",
    "description": "Explicación detallada del funcionamiento y lógica de negocio",
    "requestExample": { ... },
    "successResponse": {
        "code": "200" o "201",
        "description": "Descripción del éxito",
        "example": { ... }
    },
    "errorResponses": [
        { "code": "400", "example": { "error": "...", "message": "..." } },
        { "code": "401", "example": { "error": "...", "message": "..." } },
        { "code": "404", "example": { "error": "...", "message": "..." } }
    ]
}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error('Gemini API error (generateContent):', error.message);
        return null;
    }
}

/**
 * Generate description for an endpoint (lighter version)
 */
async function generateEndpointDescription(endpointInfo, codeContext = '') {
    if (!geminiClient) return null;

    const model = geminiClient.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTIONS
    });

    const prompt = `Genera un resumen y descripción creativa para este endpoint:
${endpointInfo.method} ${endpointInfo.path}

CÓDIGO:
${codeContext.substring(0, 1000)}

Responde SOLO JSON:
{
    "summary": "...",
    "description": "...",
    "tags": ["..."]
}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
        console.error('Gemini description error:', error.message);
        return null;
    }
}

/**
 * Enhance OpenAPI spec with AI-generated content
 */
async function enhanceSpecWithAI(spec, parseResult, globalContext = null) {
    if (!geminiClient || !spec.paths) return spec;

    const enhancedSpec = JSON.parse(JSON.stringify(spec));

    for (const [pathKey, methods] of Object.entries(enhancedSpec.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
            try {
                // Find endpoint info in parseResult
                const endpoint = parseResult.endpoints?.find(
                    e => {
                        const normalizedPath = e.path.replace(/:(\w+)/g, '{$1}');
                        return normalizedPath === pathKey && e.method.toLowerCase() === method;
                    }
                );

                const aiResult = await generateApiExamples({
                    method: method.toUpperCase(),
                    path: pathKey,
                    summary: operation.summary,
                    parameters: operation.parameters,
                    requestBody: operation.requestBody
                }, endpoint?.context || '', globalContext);

                if (aiResult) {
                    if (aiResult.summary) operation.summary = aiResult.summary;
                    if (aiResult.description) operation.description = aiResult.description;

                    if (aiResult.requestExample && operation.requestBody?.content?.['application/json']) {
                        operation.requestBody.content['application/json'].example = aiResult.requestExample;
                    }

                    if (aiResult.successResponse) {
                        const code = aiResult.successResponse.code || '200';
                        if (!operation.responses[code]) {
                            operation.responses[code] = {
                                description: aiResult.successResponse.description || 'Operación exitosa',
                                content: { 'application/json': { schema: { type: 'object' } } }
                            };
                        }
                        operation.responses[code].content['application/json'].example = aiResult.successResponse.example;
                    }

                    if (aiResult.errorResponses) {
                        for (const errorResp of aiResult.errorResponses) {
                            operation.responses[errorResp.code] = {
                                description: getErrorDescription(errorResp.code),
                                content: {
                                    'application/json': {
                                        schema: { type: 'object', properties: { error: { type: 'string' } } },
                                        example: errorResp.example
                                    }
                                }
                            };
                        }
                    }
                }

                // Wait 2s to respect rate limits (15 RPM)
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error(`Error enhancing ${method} ${pathKey}:`, error.message);
            }
        }
    }

    return enhancedSpec;
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
        '422': 'Datos no procesables',
        '429': 'Demasiadas solicitudes',
        '500': 'Error interno del servidor'
    };
    return descriptions[code] || `Error HTTP ${code}`;
}

// Initialize on module load if API key is available
if (process.env.GEMINI_API_KEY) {
    initializeGemini();
}

module.exports = {
    initializeGemini,
    isGeminiAvailable,
    generateApiExamples,
    generateEndpointDescription,
    enhanceSpecWithAI
};
