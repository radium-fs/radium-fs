import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Sidebar } from './Sidebar';
import { TableOfContents } from './TableOfContents';
import { PageNav } from './PageNav';
import { MobileNav } from './MobileNav';
import { SearchModal } from './SearchModal';
import { MdxProvider } from '../mdx/Provider';
import { ThemeToggle } from '../ThemeToggle';
import { switchPathLocale, type Locale } from '../../lib/locale';

interface DocLayoutProps {
  children: ReactNode;
  locale: Locale;
}

const uiCopy: Record<Locale, {
  docs: string;
  playground: string;
  search: string;
  toggleNav: string;
}> = {
  en: {
    docs: 'Docs',
    playground: 'Playground',
    search: 'Search docs...',
    toggleNav: 'Toggle navigation',
  },
  zh: {
    docs: '文档',
    playground: 'Playground',
    search: '搜索文档...',
    toggleNav: '切换导航',
  },
};

export function DocLayout({ children, locale }: DocLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const copy = uiCopy[locale];
  const homePath = locale === 'zh' ? '/zh' : '/';

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const toggleNav = useCallback(() => {
    setMobileNavOpen((v) => !v);
  }, []);

  const closeNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <button
          onClick={toggleNav}
          className="lg:hidden text-text-secondary hover:text-text-primary transition-colors"
          title={copy.toggleNav}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>

        <Link to={homePath} className="flex items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}radium-fs-logo.png`}
            alt="radium-fs"
            className="h-7 w-7"
          />
          <span className="font-semibold text-text-primary text-sm tracking-wide">
            radium-fs
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-3 ml-2">
          <span className="text-xs text-accent font-medium">
            {copy.docs}
          </span>
          <Link
            to="/playground"
            className="text-xs text-text-secondary hover:text-text-primary transition-colors font-medium"
          >
            {copy.playground}
          </Link>
        </div>

        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 text-xs text-text-secondary bg-surface border border-border rounded-lg hover:border-accent/30 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {copy.search}
          <kbd className="text-[10px] bg-surface-raised px-1 py-0.5 rounded border border-border ml-2">
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        <div className="relative">
          <label htmlFor="docs-lang" className="sr-only">
            Language
          </label>
          <select
            id="docs-lang"
            value={locale}
            onChange={(e) => {
              const target = e.target.value as Locale;
              if (target !== locale) {
                navigate(switchPathLocale(pathname, target));
              }
            }}
            className="h-8 rounded-md border border-border bg-surface-raised text-xs text-text-secondary pl-2.5 pr-7 appearance-none focus:outline-none focus:border-accent/40"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-secondary pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <ThemeToggle />

        <a
          href="https://github.com/radium-fs/radium-fs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-secondary hover:text-text-primary transition-colors"
          title="GitHub"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 border-r border-border overflow-y-auto">
          <Sidebar locale={locale} />
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8" data-doc-content>
            <article className="prose-radium">
              <MdxProvider>
                {children}
              </MdxProvider>
            </article>
            <PageNav locale={locale} />
          </div>
        </main>

        {/* Desktop TOC */}
        <aside className="hidden xl:block w-52 shrink-0 border-l border-border overflow-y-auto">
          <TableOfContents locale={locale} />
        </aside>
      </div>

      <MobileNav locale={locale} open={mobileNavOpen} onClose={closeNav} />
      <SearchModal locale={locale} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
