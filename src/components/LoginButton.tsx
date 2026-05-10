import { useAuth0 } from '@auth0/auth0-react';

interface Props {
  className?: string;
  returnTo?: string;
}

export function LoginButton({ className, returnTo }: Props) {
  const { loginWithRedirect } = useAuth0();
  return (
    <button
      type="button"
      onClick={() =>
        loginWithRedirect({
          appState: { returnTo: returnTo ?? '/dashboard' },
        })
      }
      className={
        className ??
        'inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300'
      }
    >
      Log in
    </button>
  );
}
