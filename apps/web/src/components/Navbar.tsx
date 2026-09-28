import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icon';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-rule bg-paper sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Masthead */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-baseline space-x-2 text-ink hover:opacity-90">
              <span className="font-serif font-bold text-xl tracking-tight">Freightly</span>
              <span className="hidden sm:inline-block font-mono text-[11px] text-ink-muted uppercase tracking-wider">
                Consignment Note & Rate Ledger
              </span>
            </Link>

            <span className="hidden md:inline-flex items-center space-x-1.5 px-2 py-0.5 border border-rule font-mono text-[11px] text-ink-muted">
              <span className="w-1.5 h-1.5 bg-green-600"></span>
              <span>Active Rates: v1.0 (Live Engine)</span>
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center space-x-1 sm:space-x-4">
            <Link
              to="/"
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider border ${
                isActive('/') || location.pathname.startsWith('/compare')
                  ? 'border-ink text-ink bg-paper-card font-semibold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              Compare
            </Link>

            <Link
              to="/saved"
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider border flex items-center space-x-1.5 ${
                isActive('/saved')
                  ? 'border-ink text-ink bg-paper-card font-semibold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <Icon name="bookmark" size={16} />
              <span>Saved Lanes</span>
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/admin/rates"
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider border ${
                  isActive('/admin/rates')
                    ? 'border-ink text-ink bg-paper-card font-semibold'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                Admin Rates
              </Link>
            )}

            {/* Auth status */}
            <div className="pl-2 border-l border-rule flex items-center space-x-2">
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs text-ink-muted hidden lg:inline-block">
                    {user.email}
                  </span>
                  <button
                    onClick={() => logout()}
                    className="px-2.5 py-1 text-xs font-mono text-ink border border-rule hover:border-ink"
                    title="Sign out"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="px-3 py-1 text-xs font-mono font-medium text-ink border border-rule hover:border-ink bg-paper-card"
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
