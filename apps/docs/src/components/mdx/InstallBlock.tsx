import { useEffect, useRef, useState } from 'react';

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
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const mgr = MANAGERS.find((m) => m.id === pm)!;
  const cmd = `${mgr.id} ${mgr.verb} ${packages}`;

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  async function copyCommand() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(cmd);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = cmd;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="not-prose my-4 bg-surface-code border border-border rounded-lg overflow-hidden">
      <div className="flex items-stretch border-b border-border">
        <div className="flex">
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
      </div>
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-text-secondary font-mono">
        <span>$</span>
        <span className="truncate">{cmd}</span>
        <button
          type="button"
          onClick={copyCommand}
          className="ml-auto px-2 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary border border-border rounded transition-colors"
          aria-label="Copy install command"
          title="Copy install command"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
