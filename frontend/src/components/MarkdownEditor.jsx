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
    // Tab para cambiar nivel en listas ordenadas
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', start);
      const currentLine = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
      const scrollPos = textarea.scrollTop;

      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);
      const alphaMatch = currentLine.match(/^(\s*)([a-z])\.\s(.*)$/i);
      const romanMatch = currentLine.match(/^(\s*)([ivxlcdm]+)\.\s(.*)$/i);

      // 1. →   a. (agrega 2 espacios y cambia número a letra)
      if (numberMatch) {
        const [, spaces, , rest] = numberMatch;
        const newLine = `${spaces}  a. ${rest}`.trimEnd();
        const newText = value.substring(0, lineStart) + newLine + value.substring(lineEnd === -1 ? value.length : lineEnd);

        onChange(newText);
        setTimeout(() => {
          const newCaret = lineStart + newLine.length - rest.length;
          textarea.focus();
          textarea.setSelectionRange(newCaret, newCaret);
          textarea.scrollTop = scrollPos;
        }, 0);
        return;
      }

      // a. →     i. (agrega 2 espacios y cambia a número romano inicial)
      if (alphaMatch) {
        const [, spaces, , rest] = alphaMatch;
        const newLine = `${spaces}  i. ${rest}`.trimEnd();
        const newText = value.substring(0, lineStart) + newLine + value.substring(lineEnd === -1 ? value.length : lineEnd);

        onChange(newText);
        setTimeout(() => {
          const newCaret = lineStart + newLine.length - rest.length;
          textarea.focus();
          textarea.setSelectionRange(newCaret, newCaret);
          textarea.scrollTop = scrollPos;
        }, 0);
        return;
      }

      // i. →       i. (solo agrega 2 espacios sin cambiar el romano)
      if (romanMatch) {
        const [, spaces, roman, rest] = romanMatch;
        const newLine = `${spaces}  ${roman}. ${rest}`.trimEnd();
        const newText = value.substring(0, lineStart) + newLine + value.substring(lineEnd === -1 ? value.length : lineEnd);

        onChange(newText);
        setTimeout(() => {
          const newCaret = lineStart + newLine.length - rest.length;
          textarea.focus();
          textarea.setSelectionRange(newCaret, newCaret);
          textarea.scrollTop = scrollPos;
        }, 0);
        return;
      }

      // Caso general: insertar espacios
      insertText('  ');
      return;
    }

    // Enter para continuar listas
    if (e.key === 'Enter') {
      const textarea = e.target;
      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.substring(lineStart, start);

      // Lista con viñetas: detecta espacios iniciales y mantiene sangría
      const bulletMatch = currentLine.match(/^(\s*)([-*+])\s/);
      if (bulletMatch) {
        e.preventDefault();
        const [, spaces, bullet] = bulletMatch;
        insertText(`\n${spaces}${bullet} `);
        return;
      }

      // Lista numerada decimal: incrementa número y mantiene sangría
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
      if (numberMatch) {
        e.preventDefault();
        const [, spaces, numStr] = numberMatch;
        const nextNum = parseInt(numStr, 10) + 1;
        insertText(`\n${spaces}${nextNum}. `);
        return;
      }

      // Lista romana: incrementa numeral romano y mantiene sangría (ANTES que alfabética)
      const romanMatch = currentLine.match(/^(\s*)([ivxlcdm]+)\.\s/i);
      if (romanMatch) {
        e.preventDefault();
        const spaces = romanMatch[1];
        const roman = romanMatch[2];

        const romanToInt = (str) => {
          const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
          let total = 0;
          let prev = 0;
          const chars = str.toLowerCase().split('').reverse();
          for (const ch of chars) {
            const val = map[ch] || 0;
            if (val < prev) total -= val; else total += val;
            prev = val;
          }
          return total;
        };

        const intToRoman = (num) => {
          const romans = [
            ['m', 1000], ['cm', 900], ['d', 500], ['cd', 400],
            ['c', 100], ['xc', 90], ['l', 50], ['xl', 40],
            ['x', 10], ['ix', 9], ['v', 5], ['iv', 4], ['i', 1]
          ];
          let n = Math.max(1, Math.min(3999, num));
          let res = '';
          for (const [sym, val] of romans) {
            while (n >= val) {
              res += sym;
              n -= val;
            }
          }
          return res;
        };

        const nextRoman = intToRoman(romanToInt(roman) + 1);
        insertText(`\n${spaces}${nextRoman}. `);
        return;
      }

      // Lista alfabética: incrementa letra y mantiene sangría (DESPUÉS de romanos)
      // Excluye patrones de números romanos multi-letra (ii, iii, iv, v, etc.)
      const alphaMatch = currentLine.match(/^(\s*)([a-h]|[j-u]|[w-z])\.\s/i);
      if (alphaMatch) {
        e.preventDefault();
        const [, spaces, letter] = alphaMatch;
        const currentChar = letter.toLowerCase();
        const nextCharCode = Math.min('z'.charCodeAt(0), currentChar.charCodeAt(0) + 1);
        const nextChar = String.fromCharCode(nextCharCode);
        insertText(`\n${spaces}${nextChar}. `);
        return;
      }

      // Lista de tareas: mantiene sangría y checkbox vacío
      const taskMatch = currentLine.match(/^(\s*)(-)\s\[([ x])\]\s/);
      if (taskMatch) {
        e.preventDefault();
        const [, spaces] = taskMatch;
        insertText(`\n${spaces}- [ ] `);
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

    let syncTimeout = null;

    const syncScroll = (source, target) => {
      if (syncingRef.current) return;

      syncingRef.current = true;

      // Cancelar timeout anterior si existe
      if (syncTimeout) clearTimeout(syncTimeout);

      syncTimeout = setTimeout(() => {
        const sourceMax = source.scrollHeight - source.clientHeight;
        const targetMax = target.scrollHeight - target.clientHeight;

        if (sourceMax <= 0 || targetMax <= 0) {
          syncingRef.current = false;
          return;
        }

        const ratio = source.scrollTop / sourceMax;
        target.scrollTop = ratio * targetMax;

        syncingRef.current = false;
      }, 10); // Pequeño debounce para suavizar
    };

    const onTextScroll = () => {
      if (syncingRef.current) return;
      syncScroll(textarea, preview);
    };

    const onPreviewScroll = () => {
      if (syncingRef.current) return;
      syncScroll(preview, textarea);
    };

    textarea.addEventListener('scroll', onTextScroll, { passive: true });
    preview.addEventListener('scroll', onPreviewScroll, { passive: true });

    // Sincronizar inicialmente después de que el contenido se renderice
    const initialSync = setTimeout(() => {
      syncScroll(textarea, preview);
    }, 100);

    return () => {
      textarea.removeEventListener('scroll', onTextScroll);
      preview.removeEventListener('scroll', onPreviewScroll);
      if (syncTimeout) clearTimeout(syncTimeout);
      clearTimeout(initialSync);
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
              onChange={(e) => {
                onChange(e.target.value);

                // Sincronizar vista previa con la posición del cursor mientras se escribe
                if (activeTab === 'split') {
                  const textarea = textareaRef.current;
                  const preview = previewRef.current;
                  if (textarea && preview) {
                    // Calcular la línea actual basándose en la posición del cursor
                    const cursorPosition = textarea.selectionStart;
                    const textBeforeCursor = value.substring(0, cursorPosition);
                    const currentLine = textBeforeCursor.split('\n').length;
                    const totalLines = value.split('\n').length;

                    // Calcular ratio basado en la línea actual
                    const lineRatio = totalLines > 0 ? (currentLine / totalLines) : 0;

                    // Aplicar scroll a la vista previa con un pequeño offset
                    const previewMax = preview.scrollHeight - preview.clientHeight;
                    preview.scrollTop = lineRatio * previewMax;
                  }
                }
              }}
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
