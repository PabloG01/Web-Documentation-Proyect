import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/MarkdownHelper.css';
import { FileQuestion, X, Info, HelpCircle } from 'lucide-react';

function MarkdownHelper() {
    const [isExpanded, setIsExpanded] = useState(false);

    const syntaxExamples = [
        {
            category: 'Encabezados',
            items: [
                { syntax: '# Título 1', desc: 'Encabezado nivel 1' },
                { syntax: '## Título 2', desc: 'Encabezado nivel 2' },
                { syntax: '### Título 3', desc: 'Encabezado nivel 3' },
            ]
        },
        {
            category: 'Énfasis',
            items: [
                { syntax: '**negrita**', desc: 'Texto en negrita' },
                { syntax: '*cursiva*', desc: 'Texto en cursiva' },
                { syntax: '~~tachado~~', desc: 'Texto tachado' },
            ]
        },
        {
            category: 'Listas',
            items: [
                { syntax: '- Item\n- Item', desc: 'Lista sin orden' },
                { syntax: '1. Item\n2. Item', desc: 'Lista ordenada' },
                { syntax: '1. Item principal\n   - Subitem (3 espacios)\n   - Subitem', desc: 'Lista anidada' },
                { syntax: '- [ ] Tarea\n- [x] Completo', desc: 'Lista de tareas' },
            ]
        },
        {
            category: 'Enlaces e Imágenes',
            items: [
                { syntax: '[texto](url)', desc: 'Enlace' },
                { syntax: '![alt](imagen.jpg)', desc: 'Imagen' },
            ]
        },
        {
            category: 'Código',
            items: [
                { syntax: '`código inline`', desc: 'Código en línea' },
                { syntax: '```javascript\ncodigo\n```', desc: 'Bloque de código' },
            ]
        },
        {
            category: 'Otros',
            items: [
                { syntax: '> Cita', desc: 'Blockquote' },
                { syntax: '---', desc: 'Línea horizontal' },
                { syntax: '| Col1 | Col2 |\n|------|------|\n| A | B |', desc: 'Tabla' },
            ]
        }
    ];

    const insertSyntax = async (syntax) => {
        try {
            // Intentar usar la API moderna
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(syntax);
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            // Fallback para navegadores antiguos o contextos no seguros http
            try {
                const textArea = document.createElement("textarea");
                textArea.value = syntax;

                // Asegurar que no sea visible
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (!successful) throw new Error('Fallback copy failed');
            } catch (fallbackErr) {
                console.error('Error al copiar:', fallbackErr);
                return; // No mostrar notificación de éxito
            }
        }

        // Mostrar notificación temporal (solo si tuvo éxito)
        const notification = document.createElement('div');
        notification.className = 'syntax-copied-notification';
        notification.textContent = '✓ Copiado al portapapeles';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    };

    return createPortal(
        <>
            <div className={`markdown-helper ${isExpanded ? 'expanded' : ''}`}>
                {isExpanded && (
                    <div className="helper-content">
                        <div className="helper-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileQuestion size={20} /> Guía de Sintaxis Markdown
                            </h3>
                            <button
                                className="helper-close"
                                onClick={() => setIsExpanded(false)}
                                title="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="helper-body">
                            {syntaxExamples.map((category, idx) => (
                                <div key={idx} className="syntax-category">
                                    <h4>{category.category}</h4>
                                    {category.items.map((item, itemIdx) => (
                                        <div
                                            key={itemIdx}
                                            className="syntax-item"
                                            onClick={() => insertSyntax(item.syntax)}
                                            title="Clic para copiar"
                                        >
                                            <div className="syntax-code">
                                                <code>{item.syntax}</code>
                                            </div>
                                            <div className="syntax-desc">{item.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="helper-footer">
                            <small style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Info size={14} /> Haz clic en cualquier ejemplo para copiarlo
                            </small>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <strong>Tip:</strong> Para listas anidadas, usa 3 espacios o 1 tabulación antes del subitem
                            </div>
                        </div>
                    </div>
                )}

                <button
                    className="helper-fab"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? 'Cerrar ayuda' : 'Ayuda Markdown'}
                >
                    {isExpanded ? <X size={24} /> : <HelpCircle size={24} />}
                </button>
            </div>
        </>,
        document.body
    );
}

export default MarkdownHelper;
