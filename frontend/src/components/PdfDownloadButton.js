import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
import '../styles/PdfDownloadButton.css';

/**
 * Botón para descargar documentación como PDF
 * @param {Object} document - Objeto con los datos del documento (title, author, version, etc.)
 * @param {React.RefObject} contentRef - Referencia al elemento DOM que contiene el contenido a exportar
 */
function PdfDownloadButton({ document, contentRef }) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        if (!contentRef?.current) {
            alert('No se pudo encontrar el contenido para exportar');
            return;
        }

        setIsGenerating(true);

        try {
            // Clonar el contenido para no modificar el original
            const element = contentRef.current.cloneNode(true);

            // Agregar clase para estilos de impresión
            element.classList.add('pdf-export');

            // Configuración de html2pdf
            const options = {
                margin: [15, 15, 15, 15], // top, left, bottom, right (mm)
                filename: `${document.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    logging: false
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.page-break-before',
                    after: '.page-break-after',
                    avoid: ['pre', 'code', 'table', 'img']
                }
            };

            await html2pdf().set(options).from(element).save();

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
            title="Descargar como PDF"
        >
            {isGenerating ? '⏳ Generando...' : '📥 Descargar PDF'}
        </button>
    );
}

export default PdfDownloadButton;
