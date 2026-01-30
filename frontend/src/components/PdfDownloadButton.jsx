import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import PdfDocument from './MarkdownToPdf';
import '../styles/PdfDownloadButton.css';
import { Loader2, Download } from 'lucide-react';

/**
 * Botón para descargar documentación como PDF con texto seleccionable
 * @param {Object} document - Objeto con los datos del documento (title, author, version, content, etc.)
 */
function PdfDownloadButton({ document }) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        if (!document) {
            alert('No hay documento para exportar');
            return;
        }

        setIsGenerating(true);

        try {
            // Generar el PDF usando @react-pdf/renderer
            const blob = await pdf(<PdfDocument document={document} />).toBlob();

            // Crear URL del blob y descargar
            const url = URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            link.download = `${document.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '_')}.pdf`;
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error al generar PDF:', error);
            alert('Error al generar el PDF. Intente nuevamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button
            className={`btn btn-pdf ${isGenerating ? 'btn-loading' : ''}`}
            onClick={handleDownload}
            disabled={isGenerating}
            title="Descargar como PDF (texto seleccionable)"
        >
            {isGenerating ? (
                <>
                    <Loader2 size={16} className="spin" /> Generando...
                </>
            ) : (
                <>
                    <Download size={16} /> Descargar PDF
                </>
            )}
        </button>
    );
}

export default PdfDownloadButton;
