import { useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import type { Locale } from '../../lib/locale';

interface MobileNavProps {
  locale: Locale;
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ locale, open, onClose }: MobileNavProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 lg:hidden"
      onClick={handleOverlayClick}
    >
      <aside className="w-64 h-full bg-surface-raised border-r border-border overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">
            {locale === 'zh' ? '导航' : 'Navigation'}
          </span>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-sm"
          >
            ✕
          </button>
        </div>
        <Sidebar locale={locale} onNavigate={onClose} />
      </aside>
    </div>
  );
}
