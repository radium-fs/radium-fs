import { useEffect, useState, useMemo } from 'react';
import type { StepState } from '../../engine/types';
import { highlight, getHighlighter } from '../../lib/highlighter';
import { StatusBadge } from './StatusBadge';
import { FileTree } from './FileTree';

const CODE_COLLAPSE_THRESHOLD = 5;

interface StepCellProps {
  stepState: StepState;
  index: number;
  onFileClick: (path: string, content: string) => void;
}

export function StepCell({ stepState, index, onFileClick }: StepCellProps) {
  const { step, status, result } = stepState;
  const [codeHtml, setCodeHtml] = useState<string>('');
  const [treeOpen, setTreeOpen] = useState(true);

  const isLongCode = useMemo(
    () => step.code.split('\n').length > CODE_COLLAPSE_THRESHOLD,
    [step.code],
  );
  const [codeOpen, setCodeOpen] = useState(!isLongCode);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then(() => {
      if (cancelled) return;
      setCodeHtml(highlight(step.code, 'typescript'));
    });
    return () => { cancelled = true; };
  }, [step.code]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 bg-surface-raised border-b border-border">
        <span className="text-[11px] font-mono text-text-secondary w-5 text-right shrink-0">
          {index + 1}
        </span>
        <span className="text-xs md:text-sm font-medium text-text-primary truncate">
          {step.label}
        </span>
        <div className="flex-1" />
        <StatusBadge status={status} durationMs={result?.durationMs} />
      </div>

      {/* Code block (collapsible for long snippets) */}
      <div className="bg-surface-code relative">
        <div
          className={`px-3 md:px-4 py-2.5 md:py-3 overflow-x-auto transition-[max-height] duration-200 ${
            !codeOpen && isLongCode ? 'max-h-[84px] overflow-hidden' : ''
          }`}
        >
          {codeHtml ? (
            <div dangerouslySetInnerHTML={{ __html: codeHtml }} />
          ) : (
            <pre className="text-xs font-mono text-text-primary">{step.code}</pre>
          )}
        </div>
        {isLongCode && !codeOpen && (
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface-code to-transparent pointer-events-none" />
        )}
        {isLongCode && (
          <button
            onClick={() => setCodeOpen(!codeOpen)}
            className="relative w-full py-1.5 text-[11px] text-text-secondary hover:text-accent transition-colors bg-surface-code border-t border-border/50"
          >
            {codeOpen ? '▴ Collapse' : '▾ Show code'}
          </button>
        )}
      </div>

      {/* File tree (collapsible, shown after execution) */}
      {result?.fileTree && (
        <div className="border-t border-border">
          <button
            onClick={() => setTreeOpen(!treeOpen)}
            className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-surface-raised transition-colors"
          >
            <span className="text-text-secondary text-xs">
              {treeOpen ? '▾' : '▸'}
            </span>
            <span className="text-[11px] text-text-secondary uppercase tracking-wider">
              Files
            </span>
          </button>
          {treeOpen && (
            <div className="px-2 pb-2">
              <FileTree tree={result.fileTree} onFileClick={onFileClick} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
