import { useEffect, useState, useRef } from 'react';
import { highlight, langFromPath, getHighlighter } from '../../lib/highlighter';

interface FileInspectorProps {
  path: string;
  content: string;
  onClose: () => void;
}

export function FileInspector({ path, content, onClose }: FileInspectorProps) {
  const [html, setHtml] = useState<string>('');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then(() => {
      if (cancelled) return;
      setHtml(highlight(content, langFromPath(path)));
    });
    return () => { cancelled = true; };
  }, [path, content]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="bg-surface-raised border border-border rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="text-xs font-mono text-text-secondary truncate">
            {path}
          </span>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-sm ml-4 shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="overflow-auto p-4 flex-1">
          {html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
