'use client';

import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';

const components: Components = {
  // Code block (```...```)
  pre({ children }) {
    return (
      <pre
        className="font-mono text-[13px] leading-[1.6] rounded-[9px] px-4 py-3 my-3 overflow-x-auto"
        style={{ background: '#13161c', border: '1px solid #1b1f27', color: '#c9ccd3' }}
      >
        {children}
      </pre>
    );
  },
  // code — block (className = "language-X hljs") or inline (no className)
  code({ children, className }) {
    if (className) {
      // Block code: pass className through so hljs-* CSS applies
      return <code className={`font-mono text-[13px] ${className}`}>{children}</code>;
    }
    // Inline code chip
    return (
      <code
        className="font-mono text-[13px] px-[6px] py-px rounded-[5px]"
        style={{ background: '#1a1e25', color: '#7fd4c1' }}
      >
        {children}
      </code>
    );
  },
  // Paragraphs
  p({ children }) {
    return <p className="mb-3 last:mb-0">{children}</p>;
  },
  // Headings
  h1({ children }) {
    return <h1 className="text-[18px] font-semibold text-ink-strong mb-2 mt-4 first:mt-0">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-[16px] font-semibold text-ink-strong mb-2 mt-4 first:mt-0">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-[15px] font-semibold text-ink-strong mb-1.5 mt-3 first:mt-0">{children}</h3>;
  },
  // Lists
  ul({ children }) {
    return <ul className="list-disc list-outside pl-5 mb-3 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal list-outside pl-5 mb-3 space-y-1">{children}</ol>;
  },
  li({ children }) {
    return <li className="text-ink">{children}</li>;
  },
  // Blockquote
  blockquote({ children }) {
    return (
      <blockquote
        className="border-l-2 pl-3 my-3 text-muted italic"
        style={{ borderColor: '#5fb8a3' }}
      >
        {children}
      </blockquote>
    );
  },
  // Links
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:opacity-80">
        {children}
      </a>
    );
  },
  // Strong / bold
  strong({ children }) {
    return <strong className="font-semibold text-ink-strong">{children}</strong>;
  },
  // Horizontal rule
  hr() {
    return <hr className="my-4 border-line" />;
  },
};

interface Props {
  content: string;
}

export function MarkdownContent({ content }: Props) {
  return (
    <ReactMarkdown rehypePlugins={[[rehypeHighlight, { detect: true }]]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
