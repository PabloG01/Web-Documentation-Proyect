import React, { useState } from 'react';
import '../styles/MarkdownHelper.css';

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

    const insertSyntax = (syntax) => {
        // Copiar al portapapeles
        navigator.clipboard.writeText(syntax);

        // Mostrar notificación temporal
        const notification = document.createElement('div');
        notification.className = 'syntax-copied-notification';
        notification.textContent = '✓ Copiado al portapapeles';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    };

    return (
        <>
            <div className={`markdown-helper ${isExpanded ? 'expanded' : ''}`}>
                {isExpanded && (
                    <div className="helper-content">
                        <div className="helper-header">
                            <h3>📝 Guía de Sintaxis Markdown</h3>
                            <button
                                className="helper-close"
                                onClick={() => setIsExpanded(false)}
                                title="Cerrar"
                            >
                                ✕
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
                            <small>💡 Haz clic en cualquier ejemplo para copiarlo</small>
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
                    {isExpanded ? '✕' : '?'}
                </button>
            </div>
        </>
    );
}

export default MarkdownHelper;
