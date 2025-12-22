import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';

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

function CodeBlock({ inline, className, children }) {
  const match = /language-(\w+)/.exec(className || '');
  const language = (match && match[1]) || 'text';
  if (inline) {
    return <code className={className}>{children}</code>;
  }
  const code = Array.isArray(children) ? children.join('') : String(children);
  return (
    <div className="code-block">
      <div className="code-header">{language}</div>
      <Highlight theme={themes.github} code={code.trim()} language={language}>
        {({ className: cls, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={cls} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line, key: i })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token, key })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
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
          ul: ({ children }) => <ul className="content-ul">{children}</ul>,
          li: ({ children }) => <li className="content-li">{children}</li>,
          p: ({ children }) => <p className="content-p">{children}</p>,
          code: CodeBlock,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="content-blockquote">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="content-table-wrapper">
              <table className="content-table">{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
