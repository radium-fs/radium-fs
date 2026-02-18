import { useEffect, useState } from 'react';
import { highlight, getHighlighter } from '../../lib/highlighter';

interface ApiSignatureProps {
  children: string;
}

export function ApiSignature({ children }: ApiSignatureProps) {
  const [html, setHtml] = useState('');
  const code = typeof children === 'string' ? children.trim() : '';

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then(() => {
      if (cancelled) return;
      setHtml(highlight(code, 'typescript'));
    });
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="my-4 bg-surface-code border border-border rounded-lg px-4 py-3 overflow-x-auto not-prose">
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="text-xs font-mono text-text-primary">{code}</pre>
      )}
    </div>
  );
}
