export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quick Start', href: '/docs/getting-started' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { title: 'Space & Kind', href: '/docs/concepts/space-and-kind' },
      { title: 'Dependencies', href: '/docs/concepts/dependencies' },
      { title: 'Store & ensure()', href: '/docs/concepts/store-and-ensure' },
      { title: 'Caching', href: '/docs/concepts/caching' },
      { title: 'Commands', href: '/docs/concepts/commands' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'defineKind()', href: '/docs/api/define-kind' },
      { title: 'createStore()', href: '/docs/api/create-store' },
      { title: 'RfsSpace', href: '/docs/api/rfs-space' },
      { title: 'RfsAdapter', href: '/docs/api/rfs-adapter' },
      { title: 'Events', href: '/docs/api/events' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Node.js Setup', href: '/docs/guides/node-setup' },
      { title: 'Memory Adapter', href: '/docs/guides/memory-adapter' },
      { title: 'Disk Layout', href: '/docs/guides/disk-layout' },
    ],
  },
];

export function flatItems(): NavItem[] {
  return navigation.flatMap((s) => s.items);
}

export function findPrevNext(href: string): { prev: NavItem | null; next: NavItem | null } {
  const items = flatItems();
  const idx = items.findIndex((i) => i.href === href);
  return {
    prev: idx > 0 ? items[idx - 1] : null,
    next: idx >= 0 && idx < items.length - 1 ? items[idx + 1] : null,
  };
}
