import { Link } from 'react-router';
import { HeroDag } from '../components/HeroDag';
import { InstallBlock } from '../components/mdx/InstallBlock';

const PILLARS = [
  {
    title: 'Deterministic',
    desc: 'kind + input = dataId. The same recipe always produces the same space at the same path. No timestamps, no heuristics — pure content addressing.',
  },
  {
    title: 'Composable',
    desc: 'Spaces declare dependencies via dep(). Symlinks wire them together in milliseconds with zero copies. The result is a physical DAG you can inspect with any tool.',
  },
  {
    title: 'Resilient',
    desc: 'Delete any space and it rebuilds from its recipe on the next ensure(). Dependencies cascade automatically. Only what changed gets rebuilt.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}radium-fs-logo.png`}
            alt="radium-fs"
            className="h-7 w-7"
          />
          <span className="font-semibold text-text-primary text-sm tracking-wide">
            radium-fs
          </span>
        </Link>

        <div className="flex items-center gap-3 ml-2">
          <Link
            to="/docs"
            className="text-xs text-text-secondary hover:text-text-primary transition-colors font-medium"
          >
            Docs
          </Link>
          <Link
            to="/playground"
            className="text-xs text-text-secondary hover:text-text-primary transition-colors font-medium"
          >
            Playground
          </Link>
        </div>

        <div className="flex-1" />

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

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3 tracking-tight">
          radium-fs
        </h1>
        <p className="text-base sm:text-lg text-text-secondary max-w-xl mb-10 leading-relaxed">
          Filesystem spaces, content-addressed, linked by symlinks.
        </p>

        <div className="w-full mb-10">
          <HeroDag />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <Link
            to="/docs"
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-accent text-surface hover:bg-accent/90 transition-colors"
          >
            Read the Docs
          </Link>
          <Link
            to="/playground"
            className="px-6 py-2.5 rounded-lg text-sm font-medium border border-border text-text-primary hover:bg-surface-raised transition-colors"
          >
            Try the Playground
          </Link>
          <a
            href="https://github.com/radium-fs/radium-fs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 rounded-lg text-sm font-medium border border-border text-text-primary hover:bg-surface-raised transition-colors"
          >
            View on GitHub
          </a>
        </div>

        <InstallBlock packages="@radium-fs/core @radium-fs/node" />
      </section>

      {/* Pillars */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {PILLARS.map((p) => (
            <div key={p.title}>
              <h3 className="text-sm font-semibold text-accent mb-2 tracking-wide">
                {p.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-border text-center text-xs text-text-secondary">
        MIT License &middot; Built with radium-fs
      </footer>
    </div>
  );
}
