import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from './ProtectedRoute';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ProtectedRoute', () => {
  it('renders children directly when auth is disabled via VITE_AUTH_DISABLED', () => {
    vi.stubEnv('VITE_AUTH_DISABLED', 'true');
    render(
      <ProtectedRoute>
        <div>protected content</div>
      </ProtectedRoute>,
    );
    // No Auth0Provider is mounted here; if the gate didn't bypass it would
    // throw on the missing context, so reaching the child proves the bypass.
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('renders children directly in E2E mode via VITE_E2E', () => {
    vi.stubEnv('VITE_E2E', 'true');
    render(
      <ProtectedRoute>
        <div>protected content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});
