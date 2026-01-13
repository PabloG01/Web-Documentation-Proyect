import React from 'react';
import { Upload, Trash2, Save } from '../Icons';
import Button from '../Button';

/**
 * FileUploadCard - File upload UI for API spec files
 */
function FileUploadCard({
    fileName,
    onFileUpload,
    onClear,
    onSave,
    hasSpec,
    currentSpecId,
    isUserLoggedIn
}) {
    return (
        <div className="upload-card">
            <label htmlFor="file-input" className="upload-label">
                <div className="upload-icon"><Upload size={32} /></div>
                <div className="upload-text">
                    {fileName ? fileName : 'Selecciona un archivo .json o .js'}
                </div>
                <div className="upload-hint">
                    Haz clic para seleccionar o arrastra un archivo aquí
                </div>
            </label>
            <input
                id="file-input"
                type="file"
                accept=".json,.js,application/json,text/javascript"
                onChange={onFileUpload}
                style={{ display: 'none' }}
            />

            <div className="upload-actions">
                {fileName && (
                    <Button variant="secondary" onClick={onClear}>
                        <Trash2 size={16} /> Limpiar
                    </Button>
                )}
                {hasSpec && isUserLoggedIn && (
                    <Button variant="primary" onClick={onSave}>
                        <Save size={16} /> {currentSpecId ? 'Actualizar' : 'Guardar'}
                    </Button>
                )}
            </div>
        </div>
    );
}

export default FileUploadCard;
