import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { flatItems } from './navigation';

const items = flatItems();

export function useDocTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = items.find((i) => i.href === pathname);
    const title = match
      ? `${match.title} — radium-fs`
      : pathname === '/playground'
        ? 'Playground — radium-fs'
        : 'radium-fs';
    document.title = title;
  }, [pathname]);
}
