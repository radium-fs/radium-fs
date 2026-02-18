import type { ReactNode } from 'react';

const VARIANTS = {
  tip: {
    border: 'border-accent/40',
    bg: 'bg-accent/5',
    icon: '💡',
    label: 'Tip',
    labelColor: 'text-accent',
  },
  warning: {
    border: 'border-warning/40',
    bg: 'bg-warning/5',
    icon: '⚠️',
    label: 'Warning',
    labelColor: 'text-warning',
  },
  note: {
    border: 'border-radium-300/40',
    bg: 'bg-radium-300/5',
    icon: 'ℹ️',
    label: 'Note',
    labelColor: 'text-radium-300',
  },
} as const;

interface CalloutProps {
  type?: keyof typeof VARIANTS;
  children: ReactNode;
}

export function Callout({ type = 'note', children }: CalloutProps) {
  const v = VARIANTS[type];
  return (
    <div className={`my-4 border-l-4 ${v.border} ${v.bg} rounded-r-lg px-4 py-3 not-prose`}>
      <div className={`text-xs font-semibold ${v.labelColor} uppercase tracking-wider mb-1`}>
        {v.icon} {v.label}
      </div>
      <div className="text-sm text-text-secondary leading-relaxed">
        {children}
      </div>
    </div>
  );
}
