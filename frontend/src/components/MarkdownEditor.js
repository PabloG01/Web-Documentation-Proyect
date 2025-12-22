import React, { useState, useRef, useEffect } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import '../styles/MarkdownEditor.css';

function MarkdownEditor({ value = '', onChange, placeholder = 'Escribe aquí tu contenido...', showPreview = true }) {
  const [activeTab, setActiveTab] = useState('edit'); // 'edit', 'preview', 'split'
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const syncingRef = useRef(false);

  const insertText = (before, after = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const scrollPos = textarea.scrollTop;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    onChange(newText);

    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.scrollTop = scrollPos;
    }, 0);
  };

  const insertLine = (prefix, placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const scrollPos = textarea.scrollTop;

    const start = textarea.selectionStart;
    const lines = value.split('\n');
    let currentPos = 0;
    let lineIndex = 0;

    // Encontrar línea actual
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= start) {
        lineIndex = i;
        break;
      }
      currentPos += lines[i].length + 1; // +1 for \n
    }

    const currentLine = lines[lineIndex];
    const newLine = currentLine ? `${prefix}${currentLine}` : `${prefix}${placeholder}`;
    lines[lineIndex] = newLine;
    
    const newText = lines.join('\n');
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = currentPos + prefix.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.scrollTop = scrollPos;
    }, 0);
  };

  const insertBlock = (template) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const scrollPos = textarea.scrollTop;

    const start = textarea.selectionStart;
    const newText = value.substring(0, start) + template + value.substring(start);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + template.length;
      textarea.setSelectionRange(newPos, newPos);
      textarea.scrollTop = scrollPos;
    }, 0);
  };

  const insertImage = () => {
    const alt = prompt('Describe la imagen (texto alternativo):');
    if (!alt || alt === '') return;
    const url = prompt('URL de la imagen:');
    if (!url) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const scrollPos = textarea.scrollTop;
    const start = textarea.selectionStart;
    const imageMarkdown = `![${alt}](${url})`;
    const newText = value.substring(0, start) + imageMarkdown + value.substring(start);
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
      textarea.scrollTop = scrollPos;
    }, 0);
  };

  const toolbarActions = [
    {
      icon: '𝗕',
      title: 'Negrita',
      action: () => insertText('**', '**', 'texto en negrita')
    },
    {
      icon: '𝐼',
      title: 'Cursiva',
      action: () => insertText('*', '*', 'texto en cursiva')
    },
    {
      icon: '⚊',
      title: 'Tachado',
      action: () => insertText('~~', '~~', 'texto tachado')
    },
    {
      icon: '</>', 
      title: 'Código inline',
      action: () => insertText('`', '`', 'código')
    },
    { divider: true },
    {
      icon: 'H1',
      title: 'Título 1',
      action: () => insertLine('# ', 'Título Principal')
    },
    {
      icon: 'H2',
      title: 'Título 2',
      action: () => insertLine('## ', 'Subtítulo')
    },
    {
      icon: 'H3',
      title: 'Título 3',
      action: () => insertLine('### ', 'Encabezado')
    },
    { divider: true },
    {
      icon: '•',
      title: 'Lista con viñetas',
      action: () => insertLine('- ', 'Elemento de lista')
    },
    {
      icon: '1.',
      title: 'Lista numerada',
      action: () => insertLine('1. ', 'Elemento de lista')
    },
    {
      icon: '☑',
      title: 'Lista de tareas',
      action: () => insertLine('- [ ] ', 'Tarea pendiente')
    },
    { divider: true },
    {
      icon: '🔗',
      title: 'Link',
      action: () => insertText('[', '](https://url.com)', 'texto del enlace')
    },
    {
      icon: '🖼️',
      title: 'Imagen',
      action: () => insertImage()
    },
    {
      icon: '""',
      title: 'Cita',
      action: () => insertLine('> ', 'Texto de la cita')
    },
    {
      icon: '```',
      title: 'Bloque de código',
      action: () => insertBlock('\n```javascript\n// Tu código aquí\n```\n')
    },
    {
      icon: '⊞',
      title: 'Tabla',
      action: () => insertBlock('\n| Columna 1 | Columna 2 |\n|---|---|\n| Valor 1 | Valor 2 |\n')
    },
    {
      icon: '—',
      title: 'Línea horizontal',
      action: () => insertBlock('\n---\n')
    }
  ];

  const handleKeyDown = (e) => {
    // Tab para indentación
    if (e.key === 'Tab') {
      e.preventDefault();
      insertText('  ');
      return;
    }

    // Enter para continuar listas
    if (e.key === 'Enter') {
      const textarea = e.target;
      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.substring(lineStart, start);

      // Lista con viñetas
      const bulletMatch = currentLine.match(/^(\s*)([-*+])\s/);
      if (bulletMatch) {
        e.preventDefault();
        insertText(`\n${bulletMatch[1]}${bulletMatch[2]} `);
        return;
      }

      // Lista numerada
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
      if (numberMatch) {
        e.preventDefault();
        const nextNum = parseInt(numberMatch[2]) + 1;
        insertText(`\n${numberMatch[1]}${nextNum}. `);
        return;
      }

      // Lista de tareas
      const taskMatch = currentLine.match(/^(\s*)(-)\s\[([ x])\]\s/);
      if (taskMatch) {
        e.preventDefault();
        insertText(`\n${taskMatch[1]}- [ ] `);
        return;
      }
    }
  };

  // Sincronizar scroll entre editor y vista previa en modo dividido
  useEffect(() => {
    if (activeTab !== 'split') return;
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (!textarea || !preview) return;

    const syncScroll = (source, target) => {
      syncingRef.current = true;
      const sourceMax = source.scrollHeight - source.clientHeight;
      const targetMax = target.scrollHeight - target.clientHeight;
      const ratio = sourceMax > 0 ? source.scrollTop / sourceMax : 0;
      target.scrollTop = ratio * targetMax;
      syncingRef.current = false;
    };

    const onTextScroll = () => {
      if (syncingRef.current) return;
      syncScroll(textarea, preview);
    };
    const onPreviewScroll = () => {
      if (syncingRef.current) return;
      syncScroll(preview, textarea);
    };

    textarea.addEventListener('scroll', onTextScroll);
    preview.addEventListener('scroll', onPreviewScroll);

    // Sincronizar inicialmente
    syncScroll(textarea, preview);

    return () => {
      textarea.removeEventListener('scroll', onTextScroll);
      preview.removeEventListener('scroll', onPreviewScroll);
    };
  }, [activeTab, value]);

  return (
    <div className="markdown-editor">
      <div className="editor-toolbar">
        <div className="toolbar-section">
          {toolbarActions.map((action, idx) => {
            if (action.divider) {
              return <div key={idx} className="toolbar-divider" />;
            }
            return (
              <button
                key={idx}
                className="toolbar-btn"
                onClick={action.action}
                title={action.title}
                type="button"
              >
                {action.icon}
              </button>
            );
          })}
        </div>
        
        {showPreview && (
          <div className="toolbar-tabs">
            <button
              className={`toolbar-tab ${activeTab === 'edit' ? 'active' : ''}`}
              onClick={() => setActiveTab('edit')}
              type="button"
            >
              ✏️ Editar
            </button>
            <button
              className={`toolbar-tab ${activeTab === 'split' ? 'active' : ''}`}
              onClick={() => setActiveTab('split')}
              type="button"
            >
              ⟷ Dividido
            </button>
            <button
              className={`toolbar-tab ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
              type="button"
            >
              👁️ Vista Previa
            </button>
          </div>
        )}
      </div>

      <div className={`editor-content editor-mode-${activeTab}`}>
        {(activeTab === 'edit' || activeTab === 'split') && (
          <div className="editor-pane">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="editor-textarea"
            />
          </div>
        )}

        {(activeTab === 'preview' || activeTab === 'split') && (
          <div className="preview-pane">
            <div className="preview-label">Vista Previa</div>
            <div className="preview-content" ref={previewRef}>
              {value ? (
                <MarkdownRenderer content={value} />
              ) : (
                <p className="preview-empty">
                  La vista previa aparecerá aquí mientras escribes...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MarkdownEditor;
