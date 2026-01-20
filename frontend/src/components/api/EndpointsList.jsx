import React from 'react';
import { Pencil, Trash2 } from '../Icons';

/**
 * EndpointsList - Displays list of API endpoints with edit/delete actions
 */
function EndpointsList({
    paths = {},
    onEditEndpoint,
    onDeleteEndpoint
}) {
    const methodColors = {
        get: '#22c55e',
        post: '#3b82f6',
        put: '#f59e0b',
        patch: '#8b5cf6',
        delete: '#ef4444'
    };

    // Count total endpoints
    const endpointCount = Object.keys(paths).reduce(
        (acc, path) => acc + Object.keys(paths[path]).filter(
            m => !['parameters', 'servers', 'summary', 'description'].includes(m)
        ).length,
        0
    );

    return (
        <div className="endpoints-editor">
            <h4><Pencil size={16} /> Endpoints ({endpointCount})</h4>
            <div className="endpoints-list">
                {Object.entries(paths).map(([path, methods]) => (
                    Object.entries(methods).map(([method, operation]) => {
                        // Skip non-method properties
                        if (['parameters', 'servers', 'summary', 'description'].includes(method)) {
                            return null;
                        }

                        return (
                            <div
                                key={`${path}-${method}`}
                                className="endpoint-edit-row"
                                onClick={() => onEditEndpoint(path, method)}
                            >
                                <span
                                    className="method-tag"
                                    style={{ backgroundColor: methodColors[method] || '#6b7280' }}
                                >
                                    {method.toUpperCase()}
                                </span>
                                <span className="endpoint-path">{path}</span>
                                <span className="endpoint-summary">{operation.summary || '-'}</span>
                                <button
                                    className="btn-edit"
                                    title="Editar endpoint"
                                    onClick={(e) => { e.stopPropagation(); onEditEndpoint(path, method); }}
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    className="btn-delete"
                                    title="Eliminar endpoint"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteEndpoint(path, method);
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })
                ))}
            </div>
        </div>
    );
}

export default EndpointsList;
