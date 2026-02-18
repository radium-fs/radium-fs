import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router';
import type { Locale } from '../../lib/locale';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function toHeadingId(raw: string, fallback: string): string {
  const base = raw
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || fallback;
}

function scanHeadings(container: Element): TocItem[] {
  const headings = container.querySelectorAll('h2, h3');
  const result: TocItem[] = [];
  const used = new Map<string, number>();

  headings.forEach((h, index) => {
    const text = h.textContent ?? '';
    const fallback = `section-${index + 1}`;
    const suggested = h.id || toHeadingId(text, fallback);
    const count = used.get(suggested) ?? 0;
    const id = count === 0 ? suggested : `${suggested}-${count + 1}`;
    used.set(suggested, count + 1);

    if (!h.id || h.id !== id) {
      h.id = id;
    }

    result.push({
      id,
      text,
      level: h.tagName === 'H2' ? 2 : 3,
    });
  });

  return result;
}

interface TableOfContentsProps {
  locale: Locale;
}

export function TableOfContents({ locale }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const intersectionRef = useRef<IntersectionObserver | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const container = document.querySelector('[data-doc-content]');
    if (!container) return;

    function refresh() {
      const tocItems = scanHeadings(container);
      setItems(tocItems);
      setActiveId('');

      intersectionRef.current?.disconnect();
      if (tocItems.length === 0) return;

      intersectionRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
              break;
            }
          }
        },
        { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
      );

      const headings = container.querySelectorAll('h2, h3');
      headings.forEach((h) => intersectionRef.current!.observe(h));
    }

    refresh();

    const mutation = new MutationObserver(() => refresh());
    mutation.observe(container, { childList: true, subtree: true });

    return () => {
      mutation.disconnect();
      intersectionRef.current?.disconnect();
    };
  }, [pathname]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <nav className="py-4 text-xs">
      <h4 className="px-4 mb-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
        {locale === 'zh' ? '本页目录' : 'On this page'}
      </h4>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => handleClick(item.id)}
              className={`block w-full text-left px-4 py-1 transition-colors ${
                item.level === 3 ? 'pl-7' : ''
              } ${
                activeId === item.id
                  ? 'text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
