import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse, makeServer } from '../test/msw';
import { useProjectData } from './projectData';
import type { ProjectData } from './types';

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

const buildData = (over: Partial<ProjectData> = {}): ProjectData => ({
  slug: 'back-wall',
  name: 'Back Wall',
  currency: 'BRL',
  customCategories: [],
  contacts: [],
  expenses: [],
  ...over,
});

describe('useProjectData', () => {
  it('returns null state when given no slug', () => {
    const { result } = renderHook(() => useProjectData(undefined));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('loads the project for a given slug', async () => {
    const { result } = renderHook(() => useProjectData('back-wall'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(
      expect.objectContaining({ slug: 'back-wall', name: 'Back Wall' }),
    );
    expect(result.current.error).toBeNull();
  });

  it('captures error and clears data when load fails', async () => {
    server.use(
      http.get('*/api/data', () => new HttpResponse(null, { status: 404 })),
    );

    const { result } = renderHook(() => useProjectData('missing-slug'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toMatch(/404/);
  });

  it('save() POSTs the new data and updates local state immediately', async () => {
    let posted: unknown = null;
    server.use(
      http.post('*/api/data', async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    const { result } = renderHook(() => useProjectData('back-wall'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const next = buildData({
      expenses: [
        {
          id: 'new-1',
          date: '2026-05-10',
          category: 'Materials',
          payer: 'Joe',
          payee: 'Pedro',
          description: 'sand',
          amount: 50,
          currency: 'BRL',
          kind: 'expense',
        },
      ],
    });

    await act(async () => {
      await result.current.save(next);
    });

    expect(posted).toEqual(next);
    expect(result.current.data?.expenses).toHaveLength(1);
    expect(result.current.saving).toBe(false);
  });

  it('save() surfaces server error and leaves saving false', async () => {
    server.use(
      http.post('*/api/data', () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useProjectData('back-wall'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.save(buildData());
      } catch (e) {
        caught = e;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/500/);
    await waitFor(() => expect(result.current.error).toMatch(/500/));
    expect(result.current.saving).toBe(false);
  });
});
