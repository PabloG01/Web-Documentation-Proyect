import React from 'react';
import { ClipboardList, Folder, FileText, Trash2, ChevronRight } from '../Icons';

/**
 * SavedSpecsPanel - Left sidebar showing saved API specs grouped by project
 */
function SavedSpecsPanel({
    specs = [],
    projects = [],
    currentSpecId,
    expandedProjects = {},
    loadingSpecs = false,
    onToggleProject,
    onLoadSpec,
    onDeleteSpec
}) {
    // Group specs by project
    const groupSpecsByProject = (specs) => {
        const projectMap = new Map();
        const noProject = { id: 'no-project', name: 'Sin Proyecto', code: null, color: '#6b7280', specs: [] };

        specs.forEach(spec => {
            if (spec.project_id) {
                if (!projectMap.has(spec.project_id)) {
                    const project = projects.find(p => p.id === spec.project_id);
                    projectMap.set(spec.project_id, {
                        id: spec.project_id,
                        name: project?.name || spec.project_name || 'Proyecto',
                        code: project?.code || spec.project_code,
                        color: project?.color || '#6366f1',
                        specs: []
                    });
                }
                projectMap.get(spec.project_id).specs.push(spec);
            } else {
                noProject.specs.push(spec);
            }
        });

        const groups = Array.from(projectMap.values());
        if (noProject.specs.length > 0) {
            groups.push(noProject);
        }
        return groups;
    };

    const groupedSpecs = groupSpecsByProject(specs);

    if (loadingSpecs) {
        return (
            <div className="saved-specs-panel">
                <h3><ClipboardList size={18} /> Specs Guardadas</h3>
                <p className="loading-text">Cargando...</p>
            </div>
        );
    }

    if (specs.length === 0) {
        return (
            <div className="saved-specs-panel">
                <h3><ClipboardList size={18} /> Specs Guardadas</h3>
                <p className="empty-text">No hay specs guardadas</p>
            </div>
        );
    }

    return (
        <div className="saved-specs-panel">
            <h3><ClipboardList size={18} /> Specs Guardadas</h3>
            <div className="specs-folder-container">
                {groupedSpecs.map((group) => (
                    <div key={group.id} className="project-folder">
                        <div
                            className="project-folder-header"
                            onClick={() => onToggleProject(group.id)}
                            style={{ borderLeftColor: group.color }}
                        >
                            <span className={`folder-toggle-icon ${expandedProjects[group.id] ? 'expanded' : ''}`}>
                                <ChevronRight size={14} />
                            </span>
                            <span className="folder-icon"><Folder size={16} /></span>
                            <span className="folder-name">
                                {group.code ? `${group.code} - ${group.name}` : group.name}
                            </span>
                            <span className="folder-count">{group.specs.length}</span>
                        </div>
                        <div className={`project-folder-content ${expandedProjects[group.id] ? 'expanded' : ''}`}>
                            {group.specs.map((savedSpec) => (
                                <div
                                    key={savedSpec.id}
                                    className={`folder-spec-item ${currentSpecId === savedSpec.id ? 'active' : ''}`}
                                >
                                    <div className="spec-info" onClick={() => onLoadSpec(savedSpec)}>
                                        <span className="spec-icon"><FileText size={14} /></span>
                                        <span className="spec-name">{savedSpec.name}</span>
                                    </div>
                                    <button
                                        className="btn-delete-spec"
                                        onClick={(e) => { e.stopPropagation(); onDeleteSpec(savedSpec.id); }}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SavedSpecsPanel;
