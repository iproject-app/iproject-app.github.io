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

export const ProtectedRoute = withAuthenticationRequired(Gate, {
  onRedirecting: () => <Loading />,
});
