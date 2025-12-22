import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';

const ListDepthContext = React.createContext(0);

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractText(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map(extractText).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText(children.props.children);
  }
  return '';
}

function useListDepth() {
  return Math.max(0, React.useContext(ListDepthContext));
}

function CodeBlock({ inline, className, children }) {
  const match = /language-(\w+)/.exec(className || '');
  const language = (match && match[1]) || 'text';
  
  if (inline) {
    return (
      <code className="code-inline">
        {children}
      </code>
    );
  }
  
  const code = Array.isArray(children) ? children.join('') : String(children);
  
  // Validar lenguaje con prism
  const isValidLanguage = language && language !== 'text';
  
  try {
    return (
      <div className="code-block">
        <div className="code-header">
          <span className="code-language">{language}</span>
          <button 
            className="code-copy-btn"
            onClick={() => navigator.clipboard.writeText(code.trim())}
            title="Copiar código"
          >
            📋
          </button>
        </div>
        <Highlight theme={themes.github} code={code.trim()} language={language}>
          {({ className: cls, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={cls} style={style}>
              <code>
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line, key: i })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token, key })} />
                    ))}
                  </div>
                ))}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
    );
  } catch (error) {
    // Si falla el highlight, renderizar como pre formateado
    return (
      <div className="code-block code-block-fallback">
        <div className="code-header">
          <span className="code-language">{language}</span>
        </div>
        <pre><code>{code}</code></pre>
      </div>
    );
  }
}

function UlComponent({ children }) {
  const currentDepth = useListDepth();
  const listDepth = currentDepth;
  const nextDepth = currentDepth + 1;
  return (
    <ListDepthContext.Provider value={nextDepth}>
      <ul className={`content-ul content-ul-depth-${listDepth}`}>
        {children}
      </ul>
    </ListDepthContext.Provider>
  );
}

function OlComponent({ children }) {
  const currentDepth = useListDepth();
  const listDepth = currentDepth;
  const nextDepth = currentDepth + 1;
  return (
    <ListDepthContext.Provider value={nextDepth}>
      <ol className={`content-ol content-ol-depth-${listDepth}`}>
        {children}
      </ol>
    </ListDepthContext.Provider>
  );
}

function LiComponent({ children }) {
  const depth = Math.max(0, useListDepth() - 1);
  return (
    <li className={`content-li content-li-depth-${depth}`}>
      {children}
    </li>
  );
}

export default function MarkdownRenderer({ content }) {
  return (
    <div className="content-formatted">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => {
            const text = extractText(children);
            return <h1 id={slugify(text)} className="content-h2">{children}</h1>;
          },
          h2: ({ children }) => {
            const text = extractText(children);
            return <h2 id={slugify(text)} className="content-h3">{children}</h2>;
          },
          h3: ({ children }) => {
            const text = extractText(children);
            return <h3 id={slugify(text)} className="content-h4">{children}</h3>;
          },
          h4: ({ children }) => {
            const text = extractText(children);
            return <h4 id={slugify(text)} className="content-h5">{children}</h4>;
          },
          h5: ({ children }) => {
            const text = extractText(children);
            return <h5 id={slugify(text)} className="content-h6">{children}</h5>;
          },
          ul: UlComponent,
          ol: OlComponent,
          li: LiComponent,
          p: ({ children }) => <p className="content-p">{children}</p>,
          code: CodeBlock,
          pre: ({ children }) => {
            // react-markdown envuelve el código en <pre>, pero nuestro CodeBlock ya lo hace
            return children;
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="content-link">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="content-blockquote">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="content-table-wrapper">
              <table className="content-table">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="content-thead">{children}</thead>,
          tbody: ({ children }) => <tbody className="content-tbody">{children}</tbody>,
          tr: ({ children }) => <tr className="content-tr">{children}</tr>,
          th: ({ children }) => <th className="content-th">{children}</th>,
          td: ({ children }) => <td className="content-td">{children}</td>,
          hr: () => <hr className="content-hr" />,
          em: ({ children }) => <em>{children}</em>,
          strong: ({ children }) => <strong>{children}</strong>,
          img: ({ src, alt }) => (
            <img 
              src={src} 
              alt={alt} 
              className="content-image"
              style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
