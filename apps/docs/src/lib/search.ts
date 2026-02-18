import { navigation, flatItems, type NavItem } from './navigation';

export interface SearchResult {
  title: string;
  section: string;
  href: string;
}

const sectionMap = new Map<string, string>();
for (const section of navigation) {
  for (const item of section.items) {
    sectionMap.set(item.href, section.title);
  }
}

let indexReady = false;
let items: NavItem[] = [];

function ensureIndex() {
  if (indexReady) return;
  items = flatItems();
  indexReady = true;
}

export function search(query: string, limit = 8): SearchResult[] {
  ensureIndex();
  if (!query.trim()) return [];

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
