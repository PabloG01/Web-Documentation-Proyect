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
            schema.properties = properties;
            return { ...prev, requestBody: body };
        });
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
                                <button
                                    className={`btn btn-small ${editedEndpoint.requestBody ? 'btn-danger' : ''}`}
                                    onClick={toggleRequestBody}
                                >
                                    {editedEndpoint.requestBody ? '✕ Eliminar Body' : '+ Añadir Body'}
                                </button>
                            </div>

                            {editedEndpoint.requestBody ? (
                                <>
                                    <div className="body-fields">
                                        <div className="fields-header">
                                            <span>Campos del Body (JSON)</span>
                                            <button className="btn btn-small" onClick={addBodyField}>
                                                + Campo
                                            </button>
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
                                                <input
                                                    type="text"
                                                    value={fieldData.description || ''}
                                                    onChange={(e) => updateBodyField(fieldName, 'description', e.target.value)}
                                                    placeholder="Descripción"
                                                    className="field-desc"
                                                />
                                                <button
                                                    className="btn-icon danger"
                                                    onClick={() => removeBodyField(fieldName)}
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
                                </>
                            ) : (
                                <div className="empty-message">
                                    Este endpoint no tiene request body.
                                    Los métodos POST, PUT y PATCH típicamente requieren un body.
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
