import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { flatItems } from './navigation';
import { localeFromPath } from './locale';

export function useDocTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const locale = localeFromPath(pathname);
    const items = flatItems(locale);
    const match = items.find((i) => i.href === pathname);
    const title = match
      ? `${match.title} — radium-fs`
      : pathname === '/playground'
        ? locale === 'zh' ? 'Playground（交互演示） — radium-fs' : 'Playground — radium-fs'
        : pathname === '/zh'
          ? 'radium-fs — 中文'
        : 'radium-fs';
    document.title = title;
  }, [pathname]);
}
