import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { renderHook } from '@testing-library/react';
import { http, HttpResponse, makeServer } from '../test/msw';
import { useCreateProject, useRenameProject } from './projectAdmin';

vi.mock('@auth0/auth0-react', () => {
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

describe('useCreateProject', () => {
  it('POSTs the name to /api/projects and returns the server payload', async () => {
    let received: unknown = null;
    let authHeader: string | null = null;
    server.use(
      http.post('*/api/projects', async ({ request }) => {
        received = await request.json();
        authHeader = request.headers.get('authorization');
        return HttpResponse.json({ slug: 'kitchen', name: 'Kitchen' });
      }),
    );

    const { result } = renderHook(() => useCreateProject());
    const created = await result.current('Kitchen');

    expect(received).toEqual({ name: 'Kitchen' });
    expect(authHeader).toBe('Bearer fake-token');
    expect(created).toEqual({ slug: 'kitchen', name: 'Kitchen' });
  });

  it('throws on a 500', async () => {
    server.use(
      http.post(
        '*/api/projects',
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useCreateProject());
    await expect(result.current('whatever')).rejects.toThrow(/500/);
  });
});

describe('useRenameProject', () => {
  it('POSTs the new name to the slug-scoped rename endpoint', async () => {
    let receivedBody: unknown = null;
    let receivedUrl = '';
    server.use(
      http.post('*/api/projects/:slug/rename', async ({ request, params }) => {
        receivedBody = await request.json();
        receivedUrl = String(params.slug);
        return HttpResponse.json({ slug: 'kitchen', name: 'Kitchen Reno' });
      }),
    );

    const { result } = renderHook(() => useRenameProject());
    const renamed = await result.current('kitchen', 'Kitchen Reno');

    expect(receivedBody).toEqual({ name: 'Kitchen Reno' });
    expect(receivedUrl).toBe('kitchen');
    expect(renamed).toEqual({ slug: 'kitchen', name: 'Kitchen Reno' });
  });

  it('URL-encodes a slug that contains unsafe characters', async () => {
    let observedPath = '';
    server.use(
      http.post('*/api/projects/*', ({ request }) => {
        observedPath = new URL(request.url).pathname;
        return HttpResponse.json({ slug: 'odd', name: 'Odd' });
      }),
    );

    const { result } = renderHook(() => useRenameProject());
    await result.current('odd slug/with stuff', 'Odd');

    expect(observedPath).toContain(encodeURIComponent('odd slug/with stuff'));
  });

  it('throws on a 404', async () => {
    server.use(
      http.post(
        '*/api/projects/:slug/rename',
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    const { result } = renderHook(() => useRenameProject());
    await expect(result.current('missing', 'X')).rejects.toThrow(/404/);
  });
});
