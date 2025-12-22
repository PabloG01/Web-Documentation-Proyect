import React, { useMemo } from 'react';
import '../styles/TableOfContents.css';

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function TableOfContents({ content = '' }) {
  const items = useMemo(() => {
    const lines = content.split('\n');
    const toc = [];
    lines.forEach((line) => {
      let level = 0;
      let title = '';
      if (line.startsWith('# ')) {
        level = 2; // h2
        title = line.substring(2);
      } else if (line.startsWith('## ')) {
        level = 3; // h3
        title = line.substring(3);
      } else if (line.startsWith('### ')) {
        level = 4; // h4
        title = line.substring(4);
      }
      if (level) {
        toc.push({ level, title, id: slugify(title) });
      }
    });
    return toc;
  }, [content]);

  if (!items.length) {
    return (
      <aside className="toc-sidebar">
        <div className="toc-header">
          <h4>Índice</h4>
        </div>
        <p className="toc-empty">Sin encabezados. Usa #, ##, ### en el contenido.</p>
      </aside>
    );
  }

  return (
    <aside className="toc-sidebar">
      <div className="toc-header">
        <h4>Índice</h4>
      </div>
      <nav className="toc-list">
        {items.map((item, idx) => (
          <a
            key={`${item.id}-${idx}`}
            href={`#${item.id}`}
            className={`toc-item level-${item.level}`}
            title={item.title}
          >
            {item.title}
          </a>
        ))}
      </nav>
    </aside>
  );
}

export default TableOfContents;
