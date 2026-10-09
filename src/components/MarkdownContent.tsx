import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyIcon, CheckIcon } from '@primer/octicons-react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const PreBlock: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Extract raw text from children
    const codeText = extractText(children);
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'relative',
        margin: '12px 0',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid var(--borderColor-default, #d0d7de)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '4px 8px',
          backgroundColor: 'var(--bgColor-muted, #f6f8fa)',
          borderBottom: '1px solid var(--borderColor-muted, #d0d7de)',
        }}
      >
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: 'var(--fgColor-muted, #656d76)',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
          title="Copy code"
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '12px 14px',
          backgroundColor: 'var(--bgColor-subtle, #f6f8fa)',
          overflowX: 'auto',
          fontSize: '12.5px',
          lineHeight: '1.45',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        }}
      >
        {children}
      </pre>
    </div>
  );
};

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node) && node.props && (node.props as { children?: React.ReactNode }).children) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className }) => {
  return (
    <div
      className={`readme-markdown ${className || ''}`}
      style={{
        lineHeight: 1.6,
        wordBreak: 'break-word',
        color: 'var(--fgColor-default, #1f2328)',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children, ...props }) => (
            <div style={{ overflowX: 'auto', margin: '14px 0' }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  border: '1px solid var(--borderColor-default, #d0d7de)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  fontSize: '13px',
                }}
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead
              style={{
                backgroundColor: 'var(--bgColor-muted, #f6f8fa)',
                borderBottom: '2px solid var(--borderColor-default, #d0d7de)',
              }}
              {...props}
            >
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th
              style={{
                padding: '8px 12px',
                fontWeight: 600,
                textAlign: 'left',
                border: '1px solid var(--borderColor-default, #d0d7de)',
                color: 'var(--fgColor-default, #1f2328)',
              }}
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              style={{
                padding: '8px 12px',
                border: '1px solid var(--borderColor-default, #d0d7de)',
                verticalAlign: 'top',
              }}
              {...props}
            >
              {children}
            </td>
          ),
          tr: ({ children, ...props }) => (
            <tr
              style={{
                borderTop: '1px solid var(--borderColor-muted, #d0d7de)',
              }}
              {...props}
            >
              {children}
            </tr>
          ),
          h1: ({ children, ...props }) => (
            <h1
              style={{
                fontSize: '1.45em',
                fontWeight: 600,
                marginTop: '18px',
                marginBottom: '10px',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--borderColor-muted, #d0d7de)',
              }}
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              style={{
                fontSize: '1.25em',
                fontWeight: 600,
                marginTop: '16px',
                marginBottom: '8px',
                paddingBottom: '4px',
                borderBottom: '1px solid var(--borderColor-muted, #d0d7de)',
              }}
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              style={{
                fontSize: '1.1em',
                fontWeight: 600,
                marginTop: '14px',
                marginBottom: '6px',
              }}
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4
              style={{
                fontSize: '1em',
                fontWeight: 600,
                marginTop: '12px',
                marginBottom: '4px',
              }}
              {...props}
            >
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => (
            <p style={{ margin: '8px 0', lineHeight: 1.6 }} {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul style={{ paddingLeft: '22px', margin: '8px 0' }} {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol style={{ paddingLeft: '22px', margin: '8px 0' }} {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li style={{ margin: '3px 0' }} {...props}>
              {children}
            </li>
          ),
          hr: ({ ...props }) => (
            <hr
              style={{
                height: '1px',
                padding: 0,
                margin: '18px 0',
                backgroundColor: 'var(--borderColor-muted, #d0d7de)',
                border: 0,
              }}
              {...props}
            />
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              style={{
                padding: '0 12px',
                color: 'var(--fgColor-muted, #656d76)',
                borderLeft: '3px solid var(--borderColor-muted, #d0d7de)',
                margin: '10px 0',
              }}
              {...props}
            >
              {children}
            </blockquote>
          ),
          pre: ({ children }) => <PreBlock>{children}</PreBlock>,
          code: ({ className, children, ...props }) => {
            const isCodeBlock = Boolean(className) || String(children).includes('\n');
            if (isCodeBlock) {
              return (
                <code
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                style={{
                  backgroundColor: 'var(--bgColor-neutral-muted, rgba(175, 184, 193, 0.2))',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  fontSize: '85%',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--fgColor-accent, #0969da)',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                fontWeight: 500,
              }}
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
