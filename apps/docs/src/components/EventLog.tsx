import type { RfsEvent } from '@radium-fs/core';

interface EventLogProps {
  events: RfsEvent[];
  vertical?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  'init:start': 'text-warning',
  'init:done': 'text-accent',
  'init:cached': 'text-text-secondary',
  'init:error': 'text-error',
  'command:start': 'text-warning',
  'command:done': 'text-accent',
  'command:error': 'text-error',
  custom: 'text-text-secondary',
};

function formatEvent(event: RfsEvent): string {
  switch (event.type) {
    case 'init:start':
      return `init:start ${event.kind}`;
    case 'init:done':
      return `init:done ${event.kind}`;
    case 'init:cached':
      return `init:cached ${event.kind}`;
    case 'init:error':
      return `init:error ${event.kind}: ${event.error.message}`;
    case 'command:start':
      return `command:start ${event.kind}`;
    case 'command:done':
      return `command:done ${event.kind}`;
    case 'command:error':
      return `command:error ${event.kind}: ${event.error.message}`;
    case 'custom':
      return `custom ${event.kind}`;
  }
}

export function EventLog({ events, vertical }: EventLogProps) {
  if (vertical) {
    return (
      <div className="h-full overflow-y-auto bg-surface p-4">
        <h2 className="text-[10px] text-text-secondary uppercase tracking-wider mb-3">
          Event Stream
        </h2>
        {events.length === 0 ? (
          <p className="text-xs text-text-secondary">
            Waiting for execution...
          </p>
        ) : (
          <ol className="space-y-1.5">
            {events.map((event, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="text-[10px] text-text-secondary font-mono w-4 text-right shrink-0">
                  {i + 1}
                </span>
                <span
                  className={`text-xs font-mono ${TYPE_COLORS[event.type] ?? 'text-text-secondary'}`}
                >
                  {formatEvent(event)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <footer className="border-t border-border bg-surface px-4 py-2 overflow-x-auto whitespace-nowrap">
      <div className="flex items-center gap-1 min-h-[20px]">
        <span className="text-[10px] text-text-secondary uppercase tracking-wider mr-3 shrink-0">
          Events
        </span>
        {events.length === 0 ? (
          <span className="text-xs text-text-secondary">
            Waiting for execution...
          </span>
        ) : (
          events.map((event, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-text-secondary text-[10px]">&rarr;</span>
              )}
              <span
                className={`text-xs font-mono ${TYPE_COLORS[event.type] ?? 'text-text-secondary'}`}
              >
                {formatEvent(event)}
              </span>
            </span>
          ))
        )}
      </div>
    </footer>
  );
}
