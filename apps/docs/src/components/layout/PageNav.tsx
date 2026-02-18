import { Link, useLocation } from 'react-router';
import { findPrevNext } from '../../lib/navigation';

export function PageNav() {
  const { pathname } = useLocation();
  const { prev, next } = findPrevNext(pathname);

  if (!prev && !next) return null;

  return (
    <div className="flex items-center justify-between mt-12 pt-6 border-t border-border">
      {prev ? (
        <Link
          to={prev.href}
          className="group flex flex-col items-start gap-1"
        >
          <span className="text-[11px] text-text-secondary uppercase tracking-wider">
            Previous
          </span>
          <span className="text-sm text-text-primary group-hover:text-accent transition-colors">
            ← {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          to={next.href}
          className="group flex flex-col items-end gap-1"
        >
          <span className="text-[11px] text-text-secondary uppercase tracking-wider">
            Next
          </span>
          <span className="text-sm text-text-primary group-hover:text-accent transition-colors">
            {next.title} →
          </span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
