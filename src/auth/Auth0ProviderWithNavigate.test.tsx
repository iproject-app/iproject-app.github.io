import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Passthrough Auth0Provider so we exercise our wrapper's own config/branching
// logic (the throw-vs-tolerate decision) rather than the SDK's network behavior.
vi.mock('@auth0/auth0-react', () => ({
  Auth0Provider: ({ children }: { children: unknown }) => children,
}));

import { Auth0ProviderWithNavigate } from './Auth0ProviderWithNavigate';

afterEach(() => {
  vi.unstubAllEnvs();
});

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <Auth0ProviderWithNavigate>
        <div>app shell</div>
      </Auth0ProviderWithNavigate>
    </MemoryRouter>,
  );
}

describe('Auth0ProviderWithNavigate', () => {
  it('tolerates missing Auth0 env and renders children when auth is disabled', () => {
    vi.stubEnv('VITE_AUTH_DISABLED', 'true');
    vi.stubEnv('VITE_AUTH0_DOMAIN', '');
    vi.stubEnv('VITE_AUTH0_CLIENT_ID', '');
    renderWithRouter();
    expect(screen.getByText('app shell')).toBeInTheDocument();
  });

  it('throws when auth is enabled but Auth0 env is missing — secure default', () => {
    vi.stubEnv('VITE_AUTH0_DOMAIN', '');
    vi.stubEnv('VITE_AUTH0_CLIENT_ID', '');
    // VITE_AUTH_DISABLED unset → auth enabled. Silence React's expected
    // render-error logging so the test output stays clean.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderWithRouter()).toThrow(
      /Auth0 environment variables are not configured/,
    );
    errorSpy.mockRestore();
  });
});
