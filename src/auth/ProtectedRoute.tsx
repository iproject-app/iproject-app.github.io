import type { ReactNode } from 'react';
import { withAuthenticationRequired } from '@auth0/auth0-react';

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

/** Auth-gated route. In E2E mode (VITE_E2E=true) the auth check is bypassed
 *  so Playwright can drive the UI without a real Auth0 session. */
export function ProtectedRoute({ children }: Props) {
  if (import.meta.env.VITE_E2E === 'true') {
    return <>{children}</>;
  }
  return <Authenticated>{children}</Authenticated>;
}
