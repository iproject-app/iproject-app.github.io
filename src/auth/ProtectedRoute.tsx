import type { ReactNode } from 'react';
import { withAuthenticationRequired } from '@auth0/auth0-react';
import { isAuthDisabled } from './authDisabled';

function Loading() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center px-4">
      <div className="text-sm text-slate-500">Loading…</div>
    </div>
  );
}

interface Props {
  children: ReactNode;
}

const Gate = ({ children }: Props) => <>{children}</>;

const Authenticated = withAuthenticationRequired(Gate, {
  onRedirecting: () => <Loading />,
});

/** Auth-gated route. The auth check is bypassed when auth is disabled — in
 *  E2E mode (VITE_E2E=true) or via the VITE_AUTH_DISABLED deployment flag —
 *  so the UI renders without a real Auth0 session. */
export function ProtectedRoute({ children }: Props) {
  if (isAuthDisabled()) {
    return <>{children}</>;
  }
  return <Authenticated>{children}</Authenticated>;
}
