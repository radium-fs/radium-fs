import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function scanHeadings(container: Element): TocItem[] {
  const headings = container.querySelectorAll('h2, h3');
  const result: TocItem[] = [];
  headings.forEach((h) => {
    if (!h.id) {
      h.id = h.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? '';
    }
    result.push({
      id: h.id,
      text: h.textContent ?? '',
      level: h.tagName === 'H2' ? 2 : 3,
    });
  });
  return result;
}

export function TableOfContents() {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const intersectionRef = useRef<IntersectionObserver | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const container = document.querySelector('[data-doc-content]');
    if (!container) return;

    function refresh() {
      const tocItems = scanHeadings(container!);
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

      const headings = container!.querySelectorAll('h2, h3');
      headings.forEach((h) => intersectionRef.current!.observe(h));
    }

    // Scan immediately (covers SPA navigation where content is already rendered)
    refresh();

    // Watch for lazy-loaded content appearing in the container
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
        On this page
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
