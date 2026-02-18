import { Link, useLocation } from 'react-router';
import { navigation } from '../../lib/navigation';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  return (
    <nav className="py-4 overflow-y-auto text-sm">
      {navigation.map((section) => (
        <div key={section.title} className="mb-6">
          <h3 className="px-4 mb-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            {section.title}
          </h3>
          <ul>
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={onNavigate}
                    className={`block px-4 py-1.5 text-[13px] transition-colors ${
                      active
                        ? 'text-accent font-medium bg-accent/10 border-r-2 border-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mb-6">
        <h3 className="px-4 mb-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          Interactive
        </h3>
        <ul>
          <li>
            <Link
              to="/playground"
              onClick={onNavigate}
              className={`block px-4 py-1.5 text-[13px] transition-colors ${
                pathname === '/playground'
                  ? 'text-accent font-medium bg-accent/10 border-r-2 border-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              }`}
            >
              Playground
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
