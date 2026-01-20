import React, { useState, useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import api, { projectsAPI } from '../services/api';
import '../styles/HomePage.css';
import { ChevronRight, Settings, Globe, Zap, Package } from '../components/Icons';

function HomePage() {
  const [specs, setSpecs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'testing' | 'success' | 'error'

  // Config State
  const [serverUrl, setServerUrl] = useState('http://localhost:5000');
  const [environment, setEnvironment] = useState('local');

  // Accordion States
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedSpecs, setExpandedSpecs] = useState({});
  const [expandedMethods, setExpandedMethods] = useState({});

  // Initial Data Load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [specsRes, projectsRes] = await Promise.all([
          api.get('/api-specs'),
          projectsAPI.getByUser()
        ]);
        setSpecs(specsRes.data || []);
        setProjects(projectsRes.data.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper: Group Specs
  const getGroupedSpecs = () => {
    const projectMap = new Map();
    const noProject = { id: 'no-project', name: 'Otros Documentos', code: 'DOCS', color: '#64748b', specs: [] };

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
    if (noProject.specs.length > 0) groups.push(noProject);
    return groups;
  };

  // Helper: Parse Methods from Spec
  const getMethods = (specContent) => {
    const methods = [];
    if (!specContent?.paths) return methods;

    Object.entries(specContent.paths).forEach(([path, pathItem]) => {
      Object.entries(pathItem).forEach(([method, operation]) => {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          methods.push({
            id: `${method}-${path}`,
            method,
            path,
            summary: operation.summary,
            specContent // Keep ref to full spec
          });
        }
      });
    });
    return methods;
  };

  // Helper: Generate Mini-Spec for a single operation
  const generateSingleOpSpec = (fullSpec, method, path) => {
    const miniSpec = JSON.parse(JSON.stringify(fullSpec));
    miniSpec.paths = {
      [path]: { [method]: fullSpec.paths[path][method] }
    };
    miniSpec.servers = [{ url: serverUrl }];
    return miniSpec;
  };

  // Toggle Handlers
  const toggleProject = (id) => setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleSpec = (id) => setExpandedSpecs(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleMethod = (specId, methodId) => {
    const key = `${specId}-${methodId}`;
    setExpandedMethods(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Connection Testing
  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(serverUrl, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);
      setConnectionStatus('success');
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const groupedSpecs = getGroupedSpecs();

  return (
    <div className="home-page">
      <header className="dashboard-header">
        <h1>Panel de Pruebas API</h1>
        <p>Explora y prueba todas las APIs documentadas en el sistema.</p>
      </header>

      <div className="connection-bar">
        <div className="connection-group">
          <label>Entorno</label>
          <select
            value={environment}
            onChange={(e) => {
              setEnvironment(e.target.value);
              if (e.target.value === 'local') setServerUrl('http://localhost:5000');
            }}
          >
            <option value="local">Local</option>
            <option value="prod">Producción</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
        <div className="connection-group" style={{ flex: 2 }}>
          <label>URL Host</label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://api.example.com"
          />
        </div>
        <button
          className="btn-test-connect"
          onClick={testConnection}
          disabled={!serverUrl || connectionStatus === 'testing'}
        >
          {connectionStatus === 'testing' ? 'Probar Conexión' : 'Probar Conexión'}
        </button>
      </div>

      {connectionStatus === 'success' && <div style={{ color: '#10b981', marginBottom: '1rem' }}>✅ Conexión establecida correctamente</div>}
      {connectionStatus === 'error' && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>❌ No se pudo conectar al host</div>}

      <div className="api-sections">
        {loading ? (
          <div className="loading-container">Cargando especificaciones...</div>
        ) : groupedSpecs.map(group => (
          <div key={group.id} className="project-section">
            <div
              className={`project-header ${expandedProjects[group.id] ? 'expanded' : ''}`}
              onClick={() => toggleProject(group.id)}
              style={{ borderLeftColor: group.color }}
            >
              <span>{group.code} - {group.name}</span>
              <span className="toggle-icon"><ChevronRight size={20} /></span>
            </div>

            <div className={`project-content ${expandedProjects[group.id] ? 'expanded' : ''}`}>
              {group.specs.map(spec => (
                <div key={spec.id} className="spec-item">
                  <div
                    className={`spec-header ${expandedSpecs[spec.id] ? 'expanded' : ''}`}
                    onClick={() => toggleSpec(spec.id)}
                  >
                    <span className="spec-name">{spec.name}</span>
                    <span className="toggle-icon"><ChevronRight size={16} /></span>
                  </div>

                  <div className={`spec-content ${expandedSpecs[spec.id] ? 'expanded' : ''}`}>
                    <div className="method-list">
                      {getMethods(spec.spec_content).map(item => (
                        <div key={item.id} className="method-item">
                          <div
                            className="method-trigger"
                            onClick={() => toggleMethod(spec.id, item.id)}
                          >
                            <span className={`method-badge method-${item.method}`}>{item.method}</span>
                            <span className="method-path">{item.path}</span>
                            <span className="method-summary">{item.summary}</span>
                          </div>

                          <div className={`method-details ${expandedMethods[`${spec.id}-${item.id}`] ? 'expanded' : ''}`}>
                            {expandedMethods[`${spec.id}-${item.id}`] && (
                              <div className="mini-swagger-ui">
                                <SwaggerUI
                                  spec={generateSingleOpSpec(item.specContent, item.method, item.path)}
                                  docExpansion="full"
                                  defaultModelsExpandDepth={-1}
                                  displayRequestDuration={true}
                                  tryItOutEnabled={true}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {getMethods(spec.spec_content).length === 0 && (
                        <div style={{ padding: '1rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No se encontraron endpoints en esta especificación.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {groupedSpecs.length === 0 && !loading && (
          <div className="empty-container">
            No hay APIs registradas. Crea una nueva documentación para comenzar.
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
