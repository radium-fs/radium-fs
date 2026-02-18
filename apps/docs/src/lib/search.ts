import { flatItems, navigationForLocale, type NavItem } from './navigation';
import type { Locale } from './locale';

export interface SearchResult {
  title: string;
  section: string;
  href: string;
}

interface SearchIndex {
  items: NavItem[];
  sectionMap: Map<string, string>;
}

const indices: Record<Locale, SearchIndex | null> = {
  en: null,
  zh: null,
};

function ensureIndex(locale: Locale): SearchIndex {
  const existing = indices[locale];
  if (existing) return existing;

  const sectionMap = new Map<string, string>();
  for (const section of navigationForLocale(locale)) {
    for (const item of section.items) {
      sectionMap.set(item.href, section.title);
    }
  }

  const index = {
    items: flatItems(locale),
    sectionMap,
  };

  indices[locale] = index;
  return index;
}

export function search(query: string, locale: Locale, limit = 8): SearchResult[] {
  if (!query.trim()) return [];

  const { items, sectionMap } = ensureIndex(locale);
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const item of items) {
    const title = item.title.toLowerCase();
    const href = item.href.toLowerCase();
    if (title.includes(q) || href.includes(q)) {
      results.push({
        title: item.title,
        section: sectionMap.get(item.href) ?? '',
        href: item.href,
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}
