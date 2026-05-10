import { useAuth0 } from '@auth0/auth0-react';

interface Props {
  className?: string;
}

export function LogoutButton({ className }: Props) {
  const { logout } = useAuth0();
  return (
    <button
      type="button"
      onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
      className={
        className ??
        'inline-flex h-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-100 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300'
      }
    >
      Log out
    </button>
  );
}
