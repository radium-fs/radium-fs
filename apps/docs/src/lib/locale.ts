export type Locale = 'en' | 'zh';

export function localeFromPath(pathname: string): Locale {
  return pathname === '/zh' || pathname.startsWith('/zh/') ? 'zh' : 'en';
}

export function isDocPath(pathname: string): boolean {
  return pathname === '/docs' || pathname.startsWith('/docs/')
    || pathname === '/zh/docs' || pathname.startsWith('/zh/docs/');
}

export function switchPathLocale(pathname: string, target: Locale): string {
  if (target === 'en') {
    if (pathname === '/zh') return '/';
    if (pathname.startsWith('/zh/docs')) return pathname.slice(3);
    if (pathname.startsWith('/zh/')) return pathname.slice(3) || '/';
    return pathname;
  }

  if (pathname === '/') return '/zh';
  if (pathname.startsWith('/docs')) return `/zh${pathname}`;
  if (pathname.startsWith('/zh')) return pathname;
  return pathname;
}

export function docPathForLocale(slug: string, locale: Locale): string {
  const trimmed = slug.replace(/^\/+|\/+$/g, '');
  if (!trimmed) return locale === 'zh' ? '/zh/docs' : '/docs';
  return locale === 'zh' ? `/zh/docs/${trimmed}` : `/docs/${trimmed}`;
}
