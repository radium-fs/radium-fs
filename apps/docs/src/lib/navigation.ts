import { docPathForLocale, localeFromPath, type Locale } from './locale';

export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavSchemaItem {
  slug: string;
  title: {
    en: string;
    zh: string;
  };
}

interface NavSchemaSection {
  title: {
    en: string;
    zh: string;
  };
  items: NavSchemaItem[];
}

const NAV_SCHEMA: NavSchemaSection[] = [
  {
    title: { en: 'Getting Started', zh: '快速开始' },
    items: [
      { slug: '', title: { en: 'Introduction', zh: '介绍' } },
      { slug: 'getting-started', title: { en: 'Quick Start', zh: '快速上手' } },
    ],
  },
  {
    title: { en: 'Core Concepts', zh: '核心概念' },
    items: [
      { slug: 'concepts/space-and-kind', title: { en: 'Space & Kind', zh: 'Space 与 Kind' } },
      { slug: 'concepts/dependencies', title: { en: 'Dependencies', zh: '依赖关系' } },
      { slug: 'concepts/store-and-ensure', title: { en: 'Store & ensure()', zh: 'Store 与 ensure()' } },
      { slug: 'concepts/caching', title: { en: 'Caching', zh: '缓存机制' } },
      { slug: 'concepts/commands', title: { en: 'Commands', zh: '命令系统' } },
    ],
  },
  {
    title: { en: 'API Reference', zh: 'API 参考' },
    items: [
      { slug: 'api/define-kind', title: { en: 'defineKind()', zh: 'defineKind()' } },
      { slug: 'api/create-store', title: { en: 'createStore()', zh: 'createStore()' } },
      { slug: 'api/rfs-space', title: { en: 'RfsSpace', zh: 'RfsSpace' } },
      { slug: 'api/rfs-adapter', title: { en: 'RfsAdapter', zh: 'RfsAdapter' } },
      { slug: 'api/events', title: { en: 'Events', zh: '事件' } },
    ],
  },
  {
    title: { en: 'Guides', zh: '指南' },
    items: [
      { slug: 'guides/node-setup', title: { en: 'Node.js Setup', zh: 'Node.js 配置' } },
      { slug: 'guides/memory-adapter', title: { en: 'Memory Adapter', zh: '内存适配器' } },
      { slug: 'guides/disk-layout', title: { en: 'Disk Layout', zh: '磁盘布局' } },
    ],
  },
];

const cache: Record<Locale, NavSection[] | null> = {
  en: null,
  zh: null,
};

export function navigationForLocale(locale: Locale): NavSection[] {
  if (cache[locale]) return cache[locale];

  const value = NAV_SCHEMA.map((section) => ({
    title: section.title[locale],
    items: section.items.map((item) => ({
      title: item.title[locale],
      href: docPathForLocale(item.slug, locale),
    })),
  }));

  cache[locale] = value;
  return value;
}

export function flatItems(locale: Locale): NavItem[] {
  return navigationForLocale(locale).flatMap((section) => section.items);
}

export function findPrevNext(href: string): { prev: NavItem | null; next: NavItem | null } {
  const locale = localeFromPath(href);
  const items = flatItems(locale);
  const idx = items.findIndex((i) => i.href === href);
  return {
    prev: idx > 0 ? items[idx - 1] : null,
    next: idx >= 0 && idx < items.length - 1 ? items[idx + 1] : null,
  };
}
