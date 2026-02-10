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
  const [activeId, setActiveId] = React.useState('');

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

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -60% 0px' }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // Update active ID immediately for better UX
      setActiveId(id);
    }
  };

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
            className={`toc-item level-${item.level} ${activeId === item.id ? 'active' : ''}`}
            onClick={(e) => handleClick(e, item.id)}
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
