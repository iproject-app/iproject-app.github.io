import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { LoginButton } from './LoginButton';
import { LogoutButton } from './LogoutButton';

export function NavBar() {
  const { isAuthenticated, isLoading, user } = useAuth0();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-slate-800 text-white'
        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2"
          onClick={() => setMobileOpen(false)}
        >
          <img
            src="/logo-transparent.png"
            alt="iproject.app"
            className="h-8 w-8 sm:h-9 sm:w-9"
          />
          <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
            iproject<span className="text-brand-400">.app</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!isLoading && !isAuthenticated && <LoginButton />}
          {!isLoading && isAuthenticated && (
            <>
              <span className="max-w-[12rem] truncate text-sm text-slate-300">
                {user?.name ?? user?.email}
              </span>
              <LogoutButton />
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-800/80 bg-slate-950 md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-3 py-3">
            <NavLink
              to="/"
              end
              className={navLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              Home
            </NavLink>
            {isAuthenticated && (
              <NavLink
                to="/dashboard"
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </NavLink>
            )}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-800/80 pt-3">
              {!isLoading && !isAuthenticated && (
                <LoginButton className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-400" />
              )}
              {!isLoading && isAuthenticated && (
                <>
                  <span className="px-3 text-sm text-slate-400">
                    Signed in as {user?.name ?? user?.email}
                  </span>
                  <LogoutButton className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800" />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
