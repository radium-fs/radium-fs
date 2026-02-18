import { useEffect, useState } from 'react';
import { highlight, getHighlighter } from '../../lib/highlighter';

interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [html, setHtml] = useState('');

  const lang = className?.replace('language-', '') ?? 'text';
  const code = typeof children === 'string' ? children.trimEnd() : '';

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then(() => {
      if (cancelled) return;
      setHtml(highlight(code, lang));
    });
    return () => { cancelled = true; };
  }, [code, lang]);

  return (
    <div className="bg-surface-code border border-border rounded-lg overflow-x-auto my-4 px-4 py-3 not-prose">
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="text-xs font-mono text-text-primary">{code}</pre>
      )}
    </div>
  );
}
