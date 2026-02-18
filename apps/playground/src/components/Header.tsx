import type { Scenario } from '../engine/types';

interface HeaderProps {
  scenarios: Scenario[];
  activeId: string;
  onSelect: (id: string) => void;
  onRun: () => void;
  onReset: () => void;
  running: boolean;
}

function GitHubIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
    </svg>
  );
}

export function Header({
  scenarios,
  activeId,
  onSelect,
  onRun,
  onReset,
  running,
}: HeaderProps) {
  return (
    <>
      {/* Top bar: logo + title + mobile run + GitHub */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
        <img
          src={`${import.meta.env.BASE_URL}radium-fs-logo.png`}
          alt="radium-fs"
          className="h-7 w-7"
        />
        <span className="font-semibold text-text-primary text-sm tracking-wide">
          radium-fs{' '}
          <span className="text-text-secondary font-normal">playground</span>
        </span>

        <div className="flex-1" />

        {/* Mobile-only: compact run button */}
        <button
          onClick={onRun}
          disabled={running}
          className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40 transition-colors"
        >
          <PlayIcon />
          {running ? '...' : 'Run'}
        </button>

        <a
          href="https://github.com/radium-fs/radium-fs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-secondary hover:text-text-primary transition-colors"
          title="GitHub"
        >
          <GitHubIcon />
        </a>
      </header>

      {/* Desktop toolbar: scenario tabs + Run/Reset */}
      <div className="hidden md:flex items-center gap-2 px-4 py-2 border-b border-border">
        <nav className="flex gap-1">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                s.id === activeId
                  ? 'bg-radium-800 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              }`}
            >
              {s.name}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        <button
          onClick={onRun}
          disabled={running}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40 transition-colors"
        >
          <PlayIcon />
          {running ? 'Running...' : 'Run All'}
        </button>
        <button
          onClick={onReset}
          disabled={running}
          className="px-3 py-1.5 rounded text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-raised disabled:opacity-40 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Mobile: scenario dropdown + tab selector rendered by App */}
    </>
  );
}
