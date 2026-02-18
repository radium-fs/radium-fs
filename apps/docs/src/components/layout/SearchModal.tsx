import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { search, type SearchResult } from '../../lib/search';
import type { Locale } from '../../lib/locale';

interface SearchModalProps {
  locale: Locale;
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ locale, open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setResults(search(query, locale));
    setSelected(0);
  }, [query, locale]);

  const go = useCallback(
    (href: string) => {
      navigate(href);
      onClose();
    },
    [navigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Enter' && results[selected]) {
        go(results[selected].href);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [results, selected, go, onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-surface-raised border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={locale === 'zh' ? '搜索文档...' : 'Search docs...'}
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-secondary"
          />
          <kbd className="text-[10px] text-text-secondary bg-surface px-1.5 py-0.5 rounded border border-border">
            Esc
          </kbd>
        </div>

        {query && (
          <ul className="max-h-64 overflow-y-auto py-2">
            {results.length === 0 ? (
              <li className="px-4 py-6 text-center text-text-secondary text-sm">
                {locale === 'zh' ? `未找到 “${query}” 的结果` : `No results for “${query}”`}
              </li>
            ) : (
              results.map((r, i) => (
                <li key={r.href}>
                  <button
                    onClick={() => go(r.href)}
                    className={`w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors ${
                      i === selected ? 'bg-accent/10' : 'hover:bg-surface'
                    }`}
                  >
                    <span className="text-sm text-text-primary">{r.title}</span>
                    <span className="text-[11px] text-text-secondary">{r.section}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {!query && (
          <div className="px-4 py-6 text-center text-text-secondary text-sm">
            {locale === 'zh' ? '输入关键词以搜索文档' : 'Start typing to search documentation'}
          </div>
        )}
      </div>
    </div>
  );
}
