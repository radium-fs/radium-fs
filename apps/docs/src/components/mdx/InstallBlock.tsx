import { useState } from 'react';

const MANAGERS = [
  { id: 'npm', label: 'npm', verb: 'install' },
  { id: 'pnpm', label: 'pnpm', verb: 'add' },
  { id: 'yarn', label: 'yarn', verb: 'add' },
  { id: 'bun', label: 'bun', verb: 'add' },
] as const;

interface InstallBlockProps {
  packages: string;
}

export function InstallBlock({ packages }: InstallBlockProps) {
  const [pm, setPm] = useState('npm');
  const mgr = MANAGERS.find((m) => m.id === pm)!;
  const cmd = `${mgr.id} ${mgr.verb} ${packages}`;

  return (
    <div className="not-prose my-4 bg-surface-code border border-border rounded-lg overflow-hidden">
      <div className="flex border-b border-border">
        {MANAGERS.map((m) => (
          <button
            key={m.id}
            onClick={() => setPm(m.id)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              pm === m.id
                ? 'text-accent bg-surface-raised'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary font-mono">
        <span>$</span>
        <span>{cmd}</span>
      </div>
    </div>
  );
}
