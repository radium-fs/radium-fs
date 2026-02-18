import type { StepStatus } from '../../engine/types';

interface StatusBadgeProps {
  status: StepStatus;
  durationMs?: number;
}

const CONFIG: Record<StepStatus, { label: string; className: string }> = {
  pending: {
    label: 'pending',
    className: 'bg-border text-text-secondary',
  },
  running: {
    label: 'running',
    className: 'bg-warning/20 text-warning animate-pulse',
  },
  built: {
    label: 'built',
    className: 'bg-accent/15 text-accent',
  },
  cached: {
    label: 'cached',
    className: 'bg-radium-800 text-radium-500',
  },
  error: {
    label: 'error',
    className: 'bg-error/15 text-error',
  },
};

export function StatusBadge({ status, durationMs }: StatusBadgeProps) {
  const { label, className } = CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium ${className}`}
    >
      {label}
      {durationMs != null && (
        <span className="opacity-60">{durationMs}ms</span>
      )}
    </span>
  );
}
