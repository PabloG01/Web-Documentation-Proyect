import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import '../styles/DocumentViewPage.css';
import '../styles/LoadingStates.css';
import TableOfContents from '../components/TableOfContents';
import MarkdownRenderer from '../components/MarkdownRenderer';
import MarkdownEditor from '../components/MarkdownEditor';
import MarkdownHelper from '../components/MarkdownHelper';
import PdfDownloadButton from '../components/PdfDownloadButton';

import Modal from '../components/Modal';
import { ToastContainer } from '../components/Toast';
import { FileText, Edit, Trash2, Info, Loader2, Check, X, Code, User, Settings, BarChart2, ClipboardList, CheckSquare, Clock } from 'lucide-react';
import DocumentHistory from '../components/DocumentHistory';

function DocumentViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [document, setDocument] = useState(null);
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [editedContent, setEditedContent] = useState({
    title: '',
    description: '',
    author: '',
    version: '',
    content: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI State
  const [toasts, setToasts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Ref para el contenido del documento (usado para exportar a PDF)
  const documentRef = useRef(null);

  // Toast helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadDocument = useCallback(async () => {
    try {
      const response = await documentsAPI.getById(id);
      setDocument(response.data);
      setEditedContent(response.data);
    } catch (err) {
      console.error('Error loading document:', err);
      // Can't show toast here as we redirect immediately, maybe pass state
      navigate('/mis-documentos');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Verificar si el usuario actual es el propietario del documento
  const isOwner = user && document && document.user_id === user.id;

  const handleEditChange = (field, value) => {
    setEditedContent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await documentsAPI.update(id, editedContent);
      setDocument(response.data);
      setIsEditing(false);
      addToast('¡Documento actualizado exitosamente!', 'success');
    } catch (err) {
      addToast('Error al actualizar: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await documentsAPI.delete(id);
      addToast('Documento eliminado exitosamente', 'success');
      setShowDeleteModal(false);
      setTimeout(() => {
        navigate('/mis-documentos');
      }, 1000);
    } catch (err) {
      addToast('Error al eliminar: ' + (err.response?.data?.error || err.message), 'error');
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return <div className="document-view-page"><p>Cargando...</p></div>;
  }

  if (!document) {
    return (
      <div className="document-view-page">
        <div className="empty-state">
          <div className="empty-icon"><FileText size={64} /></div>
          <h2>Documento no encontrado</h2>
          <button className="btn btn-primary" onClick={() => navigate('/mis-documentos')}>
            Volver a mis documentos
          </button>
        </div>
      </div>
    );
  }

  const icons = {
    api: <Code size={24} />,
    usuario: <User size={24} />,
    tecnica: <Settings size={24} />,
    procesos: <BarChart2 size={24} />,
    proyecto: <ClipboardList size={24} />,
    requisitos: <CheckSquare size={24} />
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="document-view-page">
      <div className="view-header">
        <button className="btn-back" onClick={() => navigate('/mis-documentos')}>
          ← Volver
        </button>
        <div className="header-actions">
          {!isEditing && (
            <>
              <PdfDownloadButton document={document} />
              <button
                className="btn btn-secondary"
                onClick={() => setShowHistoryModal(true)}
                title="Historial de versiones"
              >
                <Clock size={16} /> Historial
              </button>
              {isOwner && (
                <>
                  <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                    <Edit size={16} /> Editar
                  </button>
                  <button className="btn btn-secondary" onClick={handleDeleteClick}>
                    <Trash2 size={16} /> Eliminar
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mostrar aviso si no es propietario */}
      {!isOwner && (
        <div className="owner-notice" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} /> Este documento fue creado por <strong>{document.username || 'otro usuario'}</strong>. Solo puedes visualizarlo.
        </div>
      )}

      <div className="document-container document-with-toc">
        {!isEditing ? (
          // VISTA
          <>
            <div className="document-view" ref={documentRef}>
              <div className="view-info">
                <div className="info-header">
                  <span className="doc-icon">{icons[document.type] || <FileText size={24} />}</span>
                  <div className="info-title">
                    <h1>{document.title}</h1>
                    <p className="doc-type">{document.typeName}</p>
                  </div>
                  <span className="doc-version">{document.version}</span>
                </div>

                <div className="info-meta">
                  {/* Author display removed as it is deprecated in favor of Creator (username) */
                    document.username && (
                      <div className="meta-item">
                        <span className="meta-label">Creador:</span>
                        <span className="meta-value">{document.username}</span>
                      </div>
                    )}
                  <div className="meta-item">
                    <span className="meta-label">Creado:</span>
                    <span className="meta-value">{formatDate(document.created_at)}</span>
                  </div>
                  {document.updated_at && (
                    <div className="meta-item">
                      <span className="meta-label">Actualizado:</span>
                      <span className="meta-value">{formatDate(document.updated_at)}</span>
                    </div>
                  )}
                </div>

                {document.description && (
                  <div className="info-description">
                    <p>{document.description}</p>
                  </div>
                )}
              </div>

              <div className="document-content">
                <MarkdownRenderer content={document.content} />
              </div>
            </div>

            <TableOfContents content={document.content} />
          </>
        ) : (
          // EDICIÓN (solo si es propietario)
          <>
            <div className="document-edit">
              <div className="edit-row header-fields">
                <div className="edit-section title-field">
                  <label>Título</label>
                  <input
                    type="text"
                    value={editedContent.title}
                    onChange={(e) => handleEditChange('title', e.target.value)}
                    placeholder="Título del documento"
                  />
                </div>

                <div className="edit-section version-field">
                  <label>Versión</label>
                  <input
                    type="text"
                    value={editedContent.version}
                    onChange={(e) => handleEditChange('version', e.target.value)}
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div className="edit-section">
                <label>Descripción</label>
                <input
                  type="text"
                  value={editedContent.description}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  placeholder="Descripción breve"
                />
              </div>

              <div className="edit-section">
                <label>Contenido</label>
                <MarkdownEditor
                  value={editedContent.content}
                  onChange={(newContent) => handleEditChange('content', newContent)}
                  placeholder="Contenido del documento"
                  showPreview={true}
                />
              </div>

              <div className="edit-actions">
                <button
                  className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <><Loader2 size={16} className="spin" /> Guardando...</> : <><Check size={16} /> Guardar cambios</>}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteClick}
                  disabled={saving}
                >
                  <Trash2 size={16} /> Eliminar documento
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  <X size={16} /> Cancelar
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Documento"
        size="small"
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={handleConfirmDelete}>
              Sí, eliminar
            </button>
          </>
        }
      >
        <p style={{ textAlign: 'center', margin: '10px 0', fontSize: '1rem' }}>
          ¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.
        </p>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Historial de Versiones"
        size="medium"
      >
        <DocumentHistory
          documentId={id}
          onClose={() => setShowHistoryModal(false)}
          onRestore={() => {
            loadDocument();
            addToast('Versión restaurada exitosamente', 'success');
          }}
        />
      </Modal>

      {/* Ayuda flotante de Markdown - solo en modo edición */}
      {isEditing && <MarkdownHelper />}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default DocumentViewPage;
