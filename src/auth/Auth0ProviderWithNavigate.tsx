import type { ReactNode } from 'react';
import { Auth0Provider, type AppState } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

export function Auth0ProviderWithNavigate({ children }: Props) {
  const navigate = useNavigate();

  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  if (!domain || !clientId) {
    // In production we want a hard failure — silently swallowing missing env
    // vars yields confusing 401s much later. Tests inject dummy values via
    // VITE_AUTH0_DOMAIN/CLIENT_ID; production sets the real ones.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        '[auth0] VITE_AUTH0_DOMAIN / VITE_AUTH0_CLIENT_ID not set; auth flows will not work.',
      );
    }
    throw new Error('Auth0 environment variables are not configured.');
  }

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo ?? window.location.pathname, { replace: true });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(audience ? { audience } : {}),
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}
