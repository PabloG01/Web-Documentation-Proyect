import React, { useState, useEffect } from 'react';
import { X, Save, FileText, List, MessageSquare, Check, AlertCircle } from 'lucide-react';
import '../styles/EndpointEditor.css';
import api from '../services/api';

const METHOD_COLORS = {
    get: '#61affe',
    post: '#49cc90',
    put: '#fca130',
    delete: '#f93e3e',
    patch: '#50e3c2',
    options: '#0d5aa7',
    head: '#9012fe'
};

const IMPLEMENTATION_TEMPLATE = `### Notas de implementación
Escribe aquí los detalles técnicos, lógica de negocio importante o comportamientos específicos.

---

### Permisos requeridos
* Lista de roles o claims necesarios.

---
`;

const RESPONSE_TEMPLATE = `### Clase de la Respuesta
Descripción detallada de la estructura de datos retornada.

---
`;

function EndpointEditor({ spec, specId, onClose, onSave, initialPath, initialMethod }) {
    const [paths, setPaths] = useState([]);
    const [selectedPath, setSelectedPath] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('');

    // Form States
    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');
    const [responses, setResponses] = useState({});

    const [isSaving, setIsSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error', text: '' }

    // Parse paths on init
    useEffect(() => {
        if (spec && spec.paths) {
            const extractedPaths = [];
            Object.keys(spec.paths).forEach(path => {
                Object.keys(spec.paths[path]).forEach(method => {
                    extractedPaths.push({
                        path,
                        method,
                        ...spec.paths[path][method]
                    });
                });
            });
            setPaths(extractedPaths);

            // Auto-select if initial props provided
            if (initialPath && initialMethod) {
                const found = extractedPaths.find(p => p.path === initialPath && p.method === initialMethod);
                if (found) {
                    selectEndpoint(initialPath, initialMethod, found);
                } else if (extractedPaths.length > 0) {
                    const first = extractedPaths[0];
                    selectEndpoint(first.path, first.method, first);
                }
            } else if (extractedPaths.length > 0) {
                const first = extractedPaths[0];
                selectEndpoint(first.path, first.method, first);
            }
        }
    }, [spec, initialPath, initialMethod]);

    const selectEndpoint = (path, method, dataOverride = null) => {
        const fullData = dataOverride || spec.paths[path][method];
        setSelectedPath(path);
        setSelectedMethod(method);

        setSummary(fullData.summary || '');
        setDescription(fullData.description || '');

        // Prepare responses map
        const resMap = {};
        if (fullData.responses) {
            Object.keys(fullData.responses).forEach(code => {
                resMap[code] = fullData.responses[code].description || '';
            });
        }
        setResponses(resMap);
        setStatusMsg(null);
    };

    const handleEndpointChange = (e) => {
        const idx = e.target.value;
        const target = paths[idx];
        selectEndpoint(target.path, target.method, target);
    };

    const handleSave = async () => {
        if (!selectedPath || !selectedMethod) return;

        setIsSaving(true);
        setStatusMsg(null);

        // Helper to ensure separator
        const ensureSeparator = (text) => {
            if (!text || !text.trim()) return text;
            const trimmed = text.trim();
            if (trimmed.endsWith('---')) return text;
            // Check if last line is separator
            const lines = trimmed.split('\n');
            if (lines.length > 0 && lines[lines.length - 1].trim() === '---') return text;

            return `${text}\n\n---`;
        };

        try {
            // Clone spec
            const updatedSpecContent = JSON.parse(JSON.stringify(spec));

            // Update specific endpoint
            const endpoint = updatedSpecContent.paths[selectedPath][selectedMethod];
            endpoint.summary = summary;
            endpoint.description = ensureSeparator(description);

            // Update responses
            Object.keys(responses).forEach(code => {
                if (endpoint.responses && endpoint.responses[code]) {
                    endpoint.responses[code].description = ensureSeparator(responses[code]);
                }
            });

            // Call API via parent handler
            if (onSave) {
                await onSave(updatedSpecContent);
            }

            setStatusMsg({ type: 'success', text: 'Documentación guardada correctamente' });
            setTimeout(() => setStatusMsg(null), 3000);

        } catch (error) {
            console.error('Faló el guardado', error);
            setStatusMsg({ type: 'error', text: 'Error al guardar cambios: ' + error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const insertTemplate = () => {
        if (!description) {
            setDescription(IMPLEMENTATION_TEMPLATE);
        } else {
            setDescription(prev => prev + '\n\n' + IMPLEMENTATION_TEMPLATE);
        }
    };

    const insertResponseTemplate = (code) => {
        setResponses(prev => ({
            ...prev,
            [code]: (prev[code] || '') + (prev[code] ? '\n\n' : '') + RESPONSE_TEMPLATE
        }));
    };

    return (
        <div className="endpoint-editor-overlay">
            <div className="endpoint-editor-modal">
                <div className="editor-header">
                    <h2><FileText size={24} className="text-icon" /> Editor de Documentación</h2>
                    <button className="close-btn" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="editor-content">
                    {/* Selector */}
                    <div className="editor-section">
                        <label>Endpoint a editar</label>
                        <select
                            className="form-select"
                            onChange={handleEndpointChange}
                            value={paths.findIndex(p => p.path === selectedPath && p.method === selectedMethod)}
                        >
                            {paths.map((p, idx) => (
                                <option key={`${p.method}-${p.path}`} value={idx}>
                                    [{p.method.toUpperCase()}] {p.path} - {p.summary || 'Sin resumen'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Main Fields */}
                    <div className="editor-section">
                        <label>Resumen Corto (Summary)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={summary}
                            onChange={e => setSummary(e.target.value)}
                            placeholder="Ej: Obtener lista de usuarios"
                        />
                    </div>

                    <div className="editor-section">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label>Descripción Extendida (Markdown)</label>
                            <button className="template-btn" onClick={insertTemplate} title="Insertar plantilla">
                                + Plantilla
                            </button>
                        </div>
                        <textarea
                            className="form-textarea"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Soporta Markdown. Usa ### para títulos."
                            style={{ minHeight: '200px' }}
                        />
                    </div>

                    {/* Responses */}
                    <div className="editor-section">
                        <label><List size={16} /> Respuestas</label>
                        <div className="responses-list">
                            {Object.keys(responses).map(code => (
                                <div key={code} className="response-item">
                                    <div className="response-header">
                                        <span className="status-code">Status {code}</span>
                                        <button
                                            className="template-btn"
                                            onClick={() => insertResponseTemplate(code)}
                                            style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                                        >
                                            + Plantilla
                                        </button>
                                    </div>
                                    <textarea
                                        className="form-textarea"
                                        value={responses[code]}
                                        onChange={e => setResponses({ ...responses, [code]: e.target.value })}
                                        style={{ minHeight: '80px' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="editor-footer">
                    {statusMsg && (
                        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: statusMsg.type === 'success' ? '#10b981' : '#ef4444' }}>
                            {statusMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                            {statusMsg.text}
                        </div>
                    )}
                    <button className="btn btn-secondary btn-cancel" onClick={onClose}>Cancelar</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EndpointEditor;
