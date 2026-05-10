import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

export function NavBar() {
  const { isAuthenticated, user, logout } = useAuth0();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-h-11 items-center gap-2">
          <img
            src="/logo.png"
            alt="iproject.app"
            className="h-9 w-auto sm:h-10"
          />
          <span className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            iproject<span className="text-brand-600">.app</span>
          </span>
        </Link>

        {isAuthenticated && user && (
          <div className="flex items-center gap-2 sm:gap-3">
            {user.picture && (
              <img
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full ring-2 ring-white"
              />
            )}
            <span className="hidden max-w-[14rem] truncate text-sm text-slate-600 sm:inline">
              {user.email}
            </span>
            <button
              type="button"
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
