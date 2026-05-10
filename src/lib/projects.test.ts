import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse, makeServer } from '../test/msw';
import { useProjects } from './projects';

vi.mock('@auth0/auth0-react', () => {
  // Stable context: same object + same function reference on every call so
  // that useApi's useCallback memoization actually memoizes, avoiding a
  // re-render loop in dependent hooks.
  const ctx = {
    isAuthenticated: true,
    getAccessTokenSilently: async () => 'fake-token',
  };
  return { useAuth0: () => ctx };
});

const server = makeServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useProjects', () => {
  it('starts in loading state and resolves with the project list', async () => {
    const { result } = renderHook(() => useProjects());

    expect(result.current.loading).toBe(true);
    expect(result.current.projects).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.projects).toEqual([
      expect.objectContaining({ slug: 'back-wall', expenseCount: 1 }),
    ]);
  });

  it('captures the error message on an HTTP 500', async () => {
    server.use(
      http.get('*/api/projects', () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.projects).toBeNull();
    expect(result.current.error).toMatch(/500/);
  });

  it('attaches Authorization: Bearer when authenticated', async () => {
    let received: string | null = null;
    server.use(
      http.get('*/api/projects', ({ request }) => {
        received = request.headers.get('authorization');
        return HttpResponse.json({ projects: [] });
      }),
    );

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(received).toBe('Bearer fake-token');
  });
});
