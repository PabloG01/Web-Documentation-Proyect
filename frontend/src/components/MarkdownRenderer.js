import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/MarkdownRenderer.css';

function MarkdownRenderer({ content }) {
  const [collapsedBlocks, setCollapsedBlocks] = useState({});
  const [copiedBlocks, setCopiedBlocks] = useState({});

  const toggleCollapse = (index) => {
    setCollapsedBlocks(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const copyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedBlocks(prev => ({ ...prev, [index]: true }));
    setTimeout(() => {
      setCopiedBlocks(prev => ({ ...prev, [index]: false }));
    }, 2000);
  };

  let codeBlockIndex = 0;

  // Asegurar que el contenido preserve los saltos de línea y espacios
  const processedContent = content ? content.replace(/\r\n/g, '\n') : '';

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            const code = String(children).replace(/\n$/, '');

            if (!inline && code.length > 0) {
              const currentIndex = codeBlockIndex++;
              const isCollapsed = collapsedBlocks[currentIndex];
              const isCopied = copiedBlocks[currentIndex];

              return (
                <div className="code-block-wrapper">
                  <div className="code-block-header">
                    <span className="code-language">{language}</span>
                    <div className="code-actions">
                      <button
                        className="code-action-btn"
                        onClick={() => toggleCollapse(currentIndex)}
                        title={isCollapsed ? 'Expandir' : 'Colapsar'}
                      >
                        {isCollapsed ? '⊕' : '⊖'}
                      </button>
                      <button
                        className="code-action-btn"
                        onClick={() => copyCode(code, currentIndex)}
                        title="Copiar código"
                      >
                        {isCopied ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={language}
                      PreTag="div"
                      {...props}
                    >
                      {code}
                    </SyntaxHighlighter>
                  )}
                </div>
              );
            }

            // Inline code
            return (
              <code className="inline-code" {...props}>
                {children}
              </code>
            );
          },
          // Mejorar tablas
          table({ children }) {
            return (
              <div className="table-wrapper">
                <table>{children}</table>
              </div>
            );
          },
          // Mejorar blockquotes
          blockquote({ children }) {
            return <blockquote className="markdown-blockquote">{children}</blockquote>;
          },
          // Añadir IDs a headings para anchors
          h1({ children }) {
            const id = String(children).toLowerCase().replace(/\s+/g, '-');
            return <h1 id={id}>{children}</h1>;
          },
          h2({ children }) {
            const id = String(children).toLowerCase().replace(/\s+/g, '-');
            return <h2 id={id}>{children}</h2>;
          },
          h3({ children }) {
            const id = String(children).toLowerCase().replace(/\s+/g, '-');
            return <h3 id={id}>{children}</h3>;
          },
          // Mejorar links
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
