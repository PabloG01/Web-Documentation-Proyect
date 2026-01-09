import React, { useState, useEffect } from 'react';
import '../styles/SpecEditor.css';

// Common suggestions data
const COMMON_STATUS_CODES = [
    { code: '200', description: 'OK - Operación exitosa' },
    { code: '201', description: 'Created - Recurso creado' },
    { code: '204', description: 'No Content - Sin contenido' },
    { code: '400', description: 'Bad Request - Solicitud inválida' },
    { code: '401', description: 'Unauthorized - No autorizado' },
    { code: '403', description: 'Forbidden - Acceso denegado' },
    { code: '404', description: 'Not Found - Recurso no encontrado' },
    { code: '409', description: 'Conflict - Conflicto de datos' },
    { code: '422', description: 'Unprocessable Entity - Datos no procesables' },
    { code: '500', description: 'Internal Server Error - Error del servidor' }
];

const COMMON_PARAM_TYPES = [
    { type: 'string', description: 'Texto' },
    { type: 'integer', description: 'Número entero' },
    { type: 'number', description: 'Número decimal' },
    { type: 'boolean', description: 'Verdadero/Falso' },
    { type: 'array', description: 'Lista de items' },
    { type: 'object', description: 'Objeto JSON' }
];

const COMMON_PARAM_SUGGESTIONS = {
    id: { type: 'integer', description: 'Identificador único del recurso' },
    userId: { type: 'integer', description: 'ID del usuario' },
    email: { type: 'string', format: 'email', description: 'Correo electrónico' },
    password: { type: 'string', format: 'password', description: 'Contraseña' },
    name: { type: 'string', description: 'Nombre' },
    title: { type: 'string', description: 'Título' },
    description: { type: 'string', description: 'Descripción' },
    page: { type: 'integer', description: 'Número de página' },
    limit: { type: 'integer', description: 'Límite de resultados' },
    sort: { type: 'string', description: 'Campo de ordenamiento' },
    order: { type: 'string', enum: ['asc', 'desc'], description: 'Orden ascendente o descendente' },
    search: { type: 'string', description: 'Término de búsqueda' },
    filter: { type: 'string', description: 'Filtro de resultados' },
    status: { type: 'string', description: 'Estado del recurso' },
    token: { type: 'string', description: 'Token de autenticación' },
    created_at: { type: 'string', format: 'date-time', description: 'Fecha de creación' },
    updated_at: { type: 'string', format: 'date-time', description: 'Fecha de actualización' }
};

/**
 * Spec Editor Component
 * Advanced editor for OpenAPI specifications with suggestions
 */
function SpecEditor({
    endpoint,
    onSave,
    onCancel,
    mode = 'edit' // 'edit' | 'create'
}) {
    const [editedEndpoint, setEditedEndpoint] = useState({
        method: 'GET',
        path: '/',
        summary: '',
        description: '',
        tags: [],
        parameters: [],
        requestBody: null,
        responses: [{ code: '200', description: 'Successful response' }],
        requiresAuth: false
    });

    const [activeTab, setActiveTab] = useState('basic');
    const [showSuggestions, setShowSuggestions] = useState(null);
    const [jsonMode, setJsonMode] = useState(false);
    const [jsonText, setJsonText] = useState('');
    const [jsonError, setJsonError] = useState('');

    useEffect(() => {
        if (endpoint) {
            setEditedEndpoint({
                ...editedEndpoint,
                ...endpoint,
                parameters: endpoint.parameters || [],
                responses: endpoint.responses || [{ code: '200', description: 'Successful response' }]
            });
        }
    }, [endpoint]);

    // Update a field
    const updateField = (field, value) => {
        setEditedEndpoint(prev => ({ ...prev, [field]: value }));
    };

    // Add parameter
    const addParameter = (location = 'query') => {
        const newParam = {
            name: '',
            in: location,
            required: location === 'path',
            schema: { type: 'string' },
            description: ''
        };
        setEditedEndpoint(prev => ({
            ...prev,
            parameters: [...prev.parameters, newParam]
        }));
    };

    // Update parameter
    const updateParameter = (index, field, value) => {
        setEditedEndpoint(prev => {
            const params = [...prev.parameters];
            if (field === 'type') {
                params[index] = { ...params[index], schema: { ...params[index].schema, type: value } };
            } else {
                params[index] = { ...params[index], [field]: value };
            }

            // Auto-fill from suggestions
            if (field === 'name' && COMMON_PARAM_SUGGESTIONS[value]) {
                const suggestion = COMMON_PARAM_SUGGESTIONS[value];
                params[index] = {
                    ...params[index],
                    schema: { type: suggestion.type, format: suggestion.format },
                    description: suggestion.description
                };
            }

            return { ...prev, parameters: params };
        });
    };

    // Remove parameter
    const removeParameter = (index) => {
        setEditedEndpoint(prev => ({
            ...prev,
            parameters: prev.parameters.filter((_, i) => i !== index)
        }));
    };

    // Add response
    const addResponse = (code = '200') => {
        const suggestion = COMMON_STATUS_CODES.find(s => s.code === code);
        const newResponse = {
            code,
            description: suggestion?.description || 'Response'
        };
        setEditedEndpoint(prev => ({
            ...prev,
            responses: [...prev.responses, newResponse]
        }));
    };

    // Update response
    const updateResponse = (index, field, value) => {
        setEditedEndpoint(prev => {
            const responses = [...prev.responses];
            responses[index] = { ...responses[index], [field]: value };

            // Auto-fill description from suggestions
            if (field === 'code') {
                const suggestion = COMMON_STATUS_CODES.find(s => s.code === value);
                if (suggestion) {
                    responses[index].description = suggestion.description;
                }
            }

            return { ...prev, responses };
        });
    };

    // Remove response
    const removeResponse = (index) => {
        setEditedEndpoint(prev => ({
            ...prev,
            responses: prev.responses.filter((_, i) => i !== index)
        }));
    };

    // Toggle request body
    const toggleRequestBody = () => {
        if (editedEndpoint.requestBody) {
            updateField('requestBody', null);
        } else {
            updateField('requestBody', {
                description: 'Request body',
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                }
            });
        }
    };

    // Add body field
    const addBodyField = () => {
        if (!editedEndpoint.requestBody) return;

        setEditedEndpoint(prev => {
            const body = { ...prev.requestBody };
            const schema = body.content['application/json'].schema;
            const fieldName = `field${Object.keys(schema.properties || {}).length + 1}`;
            schema.properties = {
                ...schema.properties,
                [fieldName]: { type: 'string', description: '' }
            };
            return { ...prev, requestBody: body };
        });
    };

    // Update body field
    const updateBodyField = (oldName, field, value) => {
        setEditedEndpoint(prev => {
            const body = { ...prev.requestBody };
            const schema = body.content['application/json'].schema;
            const properties = { ...schema.properties };

            if (field === 'name') {
                // Rename field
                const fieldData = properties[oldName];
                delete properties[oldName];
                properties[value] = fieldData;

                // Update required array if needed
                if (schema.required) {
                    schema.required = schema.required.map(r => r === oldName ? value : r);
                }

                // Auto-fill from suggestions
                if (COMMON_PARAM_SUGGESTIONS[value]) {
                    const suggestion = COMMON_PARAM_SUGGESTIONS[value];
                    properties[value] = {
                        ...properties[value],
                        type: suggestion.type,
                        format: suggestion.format,
                        description: suggestion.description
                    };
                }
            } else if (field === 'type') {
                properties[oldName] = { ...properties[oldName], type: value };
            } else if (field === 'description') {
                properties[oldName] = { ...properties[oldName], description: value };
            } else if (field === 'format') {
                properties[oldName] = { ...properties[oldName], format: value || undefined };
            } else if (field === 'example') {
                properties[oldName] = { ...properties[oldName], example: value };
            }

            schema.properties = properties;
            return { ...prev, requestBody: body };
        });
    };

    // Remove body field
    const removeBodyField = (name) => {
        setEditedEndpoint(prev => {
            const body = { ...prev.requestBody };
            const schema = body.content['application/json'].schema;
            const properties = { ...schema.properties };
            delete properties[name];
            // Also remove from required
            if (schema.required) {
                schema.required = schema.required.filter(r => r !== name);
            }
            schema.properties = properties;
            return { ...prev, requestBody: body };
        });
    };

    // Get example value based on type
    const getExampleValue = (type, format) => {
        if (format === 'email') return 'user@example.com';
        if (format === 'password') return '********';
        if (format === 'date') return '2024-01-15';
        if (format === 'date-time') return '2024-01-15T10:30:00Z';
        if (format === 'uri') return 'https://example.com';
        if (format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';

        switch (type) {
            case 'string': return 'string';
            case 'integer': return 0;
            case 'number': return 0.0;
            case 'boolean': return true;
            case 'array': return [];
            case 'object': return {};
            default: return null;
        }
    };

    const handleSave = () => {
        onSave(editedEndpoint);
    };

    const methodColors = {
        GET: '#22c55e',
        POST: '#3b82f6',
        PUT: '#f59e0b',
        PATCH: '#8b5cf6',
        DELETE: '#ef4444'
    };

    return (
        <div className="spec-editor-overlay">
            <div className="spec-editor-modal">
                <div className="editor-header">
                    <div className="endpoint-title">
                        <span
                            className="method-badge"
                            style={{ backgroundColor: methodColors[editedEndpoint.method] }}
                        >
                            {editedEndpoint.method}
                        </span>
                        <span className="path">{editedEndpoint.path}</span>
                    </div>
                    <button className="close-btn" onClick={onCancel}>✕</button>
                </div>

                <div className="editor-tabs">
                    <button
                        className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
                        onClick={() => setActiveTab('basic')}
                    >
                        📝 Básico
                    </button>
                    <button
                        className={`tab ${activeTab === 'parameters' ? 'active' : ''}`}
                        onClick={() => setActiveTab('parameters')}
                    >
                        🔧 Parámetros
                    </button>
                    <button
                        className={`tab ${activeTab === 'body' ? 'active' : ''}`}
                        onClick={() => setActiveTab('body')}
                    >
                        📦 Body
                    </button>
                    <button
                        className={`tab ${activeTab === 'responses' ? 'active' : ''}`}
                        onClick={() => setActiveTab('responses')}
                    >
                        📤 Respuestas
                    </button>
                    <button
                        className={`tab ${activeTab === 'json' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('json');
                            setJsonText(JSON.stringify(editedEndpoint, null, 2));
                            setJsonError('');
                        }}
                    >
                        { } JSON
                    </button>
                </div>

                <div className="editor-content">
                    {/* Basic Tab */}
                    {activeTab === 'basic' && (
                        <div className="tab-content">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Método HTTP</label>
                                    <select
                                        value={editedEndpoint.method}
                                        onChange={(e) => updateField('method', e.target.value)}
                                        style={{ backgroundColor: methodColors[editedEndpoint.method], color: 'white' }}
                                    >
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                        <option value="PATCH">PATCH</option>
                                        <option value="DELETE">DELETE</option>
                                    </select>
                                </div>
                                <div className="form-group flex-2">
                                    <label>Path</label>
                                    <input
                                        type="text"
                                        value={editedEndpoint.path}
                                        onChange={(e) => updateField('path', e.target.value)}
                                        placeholder="/api/resource/{id}"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Resumen</label>
                                <input
                                    type="text"
                                    value={editedEndpoint.summary}
                                    onChange={(e) => updateField('summary', e.target.value)}
                                    placeholder="Breve descripción del endpoint"
                                />
                            </div>

                            <div className="form-group">
                                <label>Descripción detallada</label>
                                <textarea
                                    value={editedEndpoint.description}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    placeholder="Descripción completa del funcionamiento..."
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={editedEndpoint.requiresAuth}
                                        onChange={(e) => updateField('requiresAuth', e.target.checked)}
                                    />
                                    Requiere autenticación
                                </label>
                            </div>

                            <div className="form-group">
                                <label>Tags</label>
                                <input
                                    type="text"
                                    value={(editedEndpoint.tags || []).join(', ')}
                                    onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                                    placeholder="users, auth, public"
                                />
                                <small>Separados por coma</small>
                            </div>
                        </div>
                    )}

                    {/* Parameters Tab */}
                    {activeTab === 'parameters' && (
                        <div className="tab-content">
                            <div className="section-header">
                                <h4>Parámetros</h4>
                                <div className="add-buttons">
                                    <button className="btn btn-small" onClick={() => addParameter('query')}>
                                        + Query
                                    </button>
                                    <button className="btn btn-small" onClick={() => addParameter('path')}>
                                        + Path
                                    </button>
                                    <button className="btn btn-small" onClick={() => addParameter('header')}>
                                        + Header
                                    </button>
                                </div>
                            </div>

                            {editedEndpoint.parameters.length === 0 ? (
                                <div className="empty-message">
                                    No hay parámetros definidos. Añade parámetros de query, path o header.
                                </div>
                            ) : (
                                <div className="params-list">
                                    {editedEndpoint.parameters.map((param, index) => (
                                        <div key={index} className="param-row">
                                            <div className="param-location">
                                                <span className={`location-badge ${param.in}`}>
                                                    {param.in}
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                value={param.name}
                                                onChange={(e) => updateParameter(index, 'name', e.target.value)}
                                                placeholder="nombre"
                                                className="param-name"
                                                list={`param-suggestions-${index}`}
                                            />
                                            <datalist id={`param-suggestions-${index}`}>
                                                {Object.keys(COMMON_PARAM_SUGGESTIONS).map(name => (
                                                    <option key={name} value={name} />
                                                ))}
                                            </datalist>
                                            <select
                                                value={param.schema?.type || 'string'}
                                                onChange={(e) => updateParameter(index, 'type', e.target.value)}
                                                className="param-type"
                                            >
                                                {COMMON_PARAM_TYPES.map(t => (
                                                    <option key={t.type} value={t.type}>{t.type}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={param.description}
                                                onChange={(e) => updateParameter(index, 'description', e.target.value)}
                                                placeholder="Descripción"
                                                className="param-desc"
                                            />
                                            <label className="required-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={param.required}
                                                    onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                                                />
                                                Req.
                                            </label>
                                            <button
                                                className="btn-icon danger"
                                                onClick={() => removeParameter(index)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Request Body Tab */}
                    {activeTab === 'body' && (
                        <div className="tab-content">
                            <div className="section-header">
                                <h4>Request Body</h4>
                                <div className="body-actions">
                                    {!editedEndpoint.requestBody && (
                                        <button className="btn btn-small btn-primary" onClick={toggleRequestBody}>
                                            + Añadir Body
                                        </button>
                                    )}
                                    {editedEndpoint.requestBody && (
                                        <>
                                            <button className="btn btn-small" onClick={addBodyField}>
                                                + Campo
                                            </button>
                                            <button className="btn btn-small btn-danger" onClick={toggleRequestBody}>
                                                ✕ Eliminar Body
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {editedEndpoint.requestBody ? (
                                <div className="body-editor">
                                    {/* Body description */}
                                    <div className="form-group">
                                        <label>Descripción del Body</label>
                                        <input
                                            type="text"
                                            value={editedEndpoint.requestBody.description || ''}
                                            onChange={(e) => {
                                                setEditedEndpoint(prev => ({
                                                    ...prev,
                                                    requestBody: { ...prev.requestBody, description: e.target.value }
                                                }));
                                            }}
                                            placeholder="Datos para crear/actualizar el recurso"
                                        />
                                    </div>

                                    {/* Content type */}
                                    <div className="content-type-badge">
                                        Content-Type: application/json
                                    </div>

                                    {/* Fields table */}
                                    <div className="body-fields">
                                        <div className="fields-table-header">
                                            <span className="th-name">Campo</span>
                                            <span className="th-type">Tipo</span>
                                            <span className="th-format">Formato</span>
                                            <span className="th-req">Req.</span>
                                            <span className="th-desc">Descripción</span>
                                            <span className="th-example">Ejemplo</span>
                                            <span className="th-actions"></span>
                                        </div>

                                        {Object.entries(editedEndpoint.requestBody.content?.['application/json']?.schema?.properties || {}).map(([fieldName, fieldData]) => (
                                            <div key={fieldName} className="body-field-row">
                                                <input
                                                    type="text"
                                                    value={fieldName}
                                                    onChange={(e) => updateBodyField(fieldName, 'name', e.target.value)}
                                                    placeholder="campo"
                                                    className="field-name"
                                                    list="body-field-suggestions"
                                                />
                                                <select
                                                    value={fieldData.type}
                                                    onChange={(e) => updateBodyField(fieldName, 'type', e.target.value)}
                                                    className="field-type"
                                                >
                                                    {COMMON_PARAM_TYPES.map(t => (
                                                        <option key={t.type} value={t.type}>{t.type}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={fieldData.format || ''}
                                                    onChange={(e) => updateBodyField(fieldName, 'format', e.target.value)}
                                                    className="field-format"
                                                >
                                                    <option value="">-</option>
                                                    <option value="email">email</option>
                                                    <option value="password">password</option>
                                                    <option value="date">date</option>
                                                    <option value="date-time">date-time</option>
                                                    <option value="uri">uri</option>
                                                    <option value="uuid">uuid</option>
                                                    <option value="int32">int32</option>
                                                    <option value="int64">int64</option>
                                                    <option value="float">float</option>
                                                    <option value="double">double</option>
                                                </select>
                                                <label className="field-required">
                                                    <input
                                                        type="checkbox"
                                                        checked={(editedEndpoint.requestBody.content?.['application/json']?.schema?.required || []).includes(fieldName)}
                                                        onChange={(e) => {
                                                            setEditedEndpoint(prev => {
                                                                const body = { ...prev.requestBody };
                                                                const schema = body.content['application/json'].schema;
                                                                let required = schema.required || [];
                                                                if (e.target.checked) {
                                                                    required = [...required, fieldName];
                                                                } else {
                                                                    required = required.filter(r => r !== fieldName);
                                                                }
                                                                schema.required = required;
                                                                return { ...prev, requestBody: body };
                                                            });
                                                        }}
                                                    />
                                                </label>
                                                <input
                                                    type="text"
                                                    value={fieldData.description || ''}
                                                    onChange={(e) => updateBodyField(fieldName, 'description', e.target.value)}
                                                    placeholder="Descripción"
                                                    className="field-desc"
                                                />
                                                <input
                                                    type="text"
                                                    value={fieldData.example || ''}
                                                    onChange={(e) => updateBodyField(fieldName, 'example', e.target.value)}
                                                    placeholder="ej: valor"
                                                    className="field-example"
                                                />
                                                <button
                                                    className="btn-icon danger"
                                                    onClick={() => removeBodyField(fieldName)}
                                                    title="Eliminar campo"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                        <datalist id="body-field-suggestions">
                                            {Object.keys(COMMON_PARAM_SUGGESTIONS).map(name => (
                                                <option key={name} value={name} />
                                            ))}
                                        </datalist>
                                    </div>

                                    {/* Quick add common fields */}
                                    <div className="quick-add-section">
                                        <span className="quick-add-label">Añadir rápido:</span>
                                        <div className="quick-add-buttons">
                                            {['email', 'password', 'name', 'description', 'id', 'status'].map(field => (
                                                <button
                                                    key={field}
                                                    className="btn btn-xs"
                                                    onClick={() => {
                                                        if (!editedEndpoint.requestBody) return;
                                                        const suggestion = COMMON_PARAM_SUGGESTIONS[field];
                                                        setEditedEndpoint(prev => {
                                                            const body = { ...prev.requestBody };
                                                            const schema = body.content['application/json'].schema;
                                                            schema.properties = {
                                                                ...schema.properties,
                                                                [field]: {
                                                                    type: suggestion?.type || 'string',
                                                                    format: suggestion?.format,
                                                                    description: suggestion?.description || ''
                                                                }
                                                            };
                                                            return { ...prev, requestBody: body };
                                                        });
                                                    }}
                                                    disabled={Object.keys(editedEndpoint.requestBody?.content?.['application/json']?.schema?.properties || {}).includes(field)}
                                                >
                                                    {field}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* JSON Preview */}
                                    <div className="json-preview">
                                        <div className="preview-header">
                                            <span>📋 Vista previa JSON</span>
                                        </div>
                                        <pre className="json-code">
                                            {JSON.stringify(
                                                Object.fromEntries(
                                                    Object.entries(editedEndpoint.requestBody?.content?.['application/json']?.schema?.properties || {})
                                                        .map(([key, val]) => [key, val.example || getExampleValue(val.type, val.format)])
                                                ),
                                                null,
                                                2
                                            )}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-message">
                                    <p>Este endpoint no tiene request body.</p>
                                    <p className="hint">Los métodos POST, PUT y PATCH típicamente requieren un body para enviar datos.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Responses Tab */}
                    {activeTab === 'responses' && (
                        <div className="tab-content">
                            <div className="section-header">
                                <h4>Respuestas</h4>
                                <div className="add-buttons">
                                    {COMMON_STATUS_CODES.slice(0, 5).map(status => (
                                        <button
                                            key={status.code}
                                            className="btn btn-small"
                                            onClick={() => addResponse(status.code)}
                                            disabled={editedEndpoint.responses.some(r => r.code === status.code)}
                                        >
                                            + {status.code}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="responses-list">
                                {editedEndpoint.responses.map((response, index) => (
                                    <div key={index} className="response-row">
                                        <select
                                            value={response.code}
                                            onChange={(e) => updateResponse(index, 'code', e.target.value)}
                                            className={`response-code status-${response.code[0]}`}
                                        >
                                            {COMMON_STATUS_CODES.map(s => (
                                                <option key={s.code} value={s.code}>{s.code}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            value={response.description}
                                            onChange={(e) => updateResponse(index, 'description', e.target.value)}
                                            placeholder="Descripción de la respuesta"
                                            className="response-desc"
                                        />
                                        <button
                                            className="btn-icon danger"
                                            onClick={() => removeResponse(index)}
                                            disabled={editedEndpoint.responses.length === 1}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="suggestions-hint">
                                💡 Los códigos 2xx indican éxito, 4xx errores del cliente, 5xx errores del servidor
                            </div>
                        </div>
                    )}

                    {/* JSON Raw Editor Tab */}
                    {activeTab === 'json' && (
                        <div className="tab-content">
                            <div className="json-editor-section">
                                <div className="json-editor-header">
                                    <h4>Edición JSON Avanzada</h4>
                                    <div className="json-actions">
                                        <button
                                            className="btn btn-small"
                                            onClick={() => {
                                                setJsonText(JSON.stringify(editedEndpoint, null, 2));
                                                setJsonError('');
                                            }}
                                        >
                                            🔄 Resetear
                                        </button>
                                        <button
                                            className="btn btn-small btn-primary"
                                            onClick={() => {
                                                try {
                                                    const parsed = JSON.parse(jsonText);
                                                    setEditedEndpoint(parsed);
                                                    setJsonError('');
                                                    setActiveTab('basic');
                                                } catch (e) {
                                                    setJsonError('JSON inválido: ' + e.message);
                                                }
                                            }}
                                        >
                                            ✅ Aplicar Cambios
                                        </button>
                                    </div>
                                </div>

                                {jsonError && (
                                    <div className="json-error">
                                        ⚠️ {jsonError}
                                    </div>
                                )}

                                <div className="json-editor-info">
                                    💡 Edita directamente el JSON para control total sobre el endpoint.
                                    Puedes añadir cualquier campo compatible con OpenAPI 3.0
                                </div>

                                <textarea
                                    className="json-textarea"
                                    value={jsonText}
                                    onChange={(e) => {
                                        setJsonText(e.target.value);
                                        setJsonError('');
                                    }}
                                    spellCheck={false}
                                    placeholder='{"method": "GET", "path": "/api/resource", ...}'
                                />

                                <div className="json-editor-help">
                                    <strong>Campos disponibles:</strong>
                                    <ul>
                                        <li><code>method</code> - GET, POST, PUT, PATCH, DELETE</li>
                                        <li><code>path</code> - Ruta del endpoint (ej: /api/users/{'{id}'})</li>
                                        <li><code>summary</code> - Resumen corto</li>
                                        <li><code>description</code> - Descripción detallada</li>
                                        <li><code>tags</code> - Array de etiquetas</li>
                                        <li><code>parameters</code> - Array de parámetros (query, path, header)</li>
                                        <li><code>requestBody</code> - Objeto con schema del body</li>
                                        <li><code>responses</code> - Array de respuestas</li>
                                        <li><code>security</code> - Requisitos de seguridad</li>
                                        <li><code>operationId</code> - ID único de la operación</li>
                                        <li><code>deprecated</code> - Marcar como deprecado (true/false)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="editor-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        Cancelar
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        💾 Guardar Endpoint
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SpecEditor;
