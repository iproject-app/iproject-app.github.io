import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { ProjectDataProvider } from './ProjectDataProvider';
import { StrictMode, createElement, type ReactNode } from 'react';
import { act, renderHook as renderHookBase, waitFor } from '@testing-library/react';
import { http, HttpResponse, makeServer } from '../test/msw';
import { useProjectData } from './projectData';
import type { ProjectData } from './types';

const renderHook: typeof renderHookBase = (callback, options) => renderHookBase(callback, {
  wrapper: ProjectDataProvider, ...options,
});
const StrictProvider = ({ children }: { children: ReactNode }) =>
  createElement(StrictMode, null, createElement(ProjectDataProvider, null, children));

const authSubject = vi.hoisted(() => ({ sub: 'owner' }));

vi.mock('@auth0/auth0-react', () => {
  const ctx = {
    isAuthenticated: true,
    user: authSubject,
    getAccessTokenSilently: async () => 'fake-token',
  };
  return { useAuth0: () => ctx };
});

const server = makeServer();

beforeEach(() => { authSubject.sub = 'owner'; });
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
    expect(result.current.saveError).toBe('failed');
    expect(result.current.saving).toBe(false);
  });
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('revision-aware saves', () => {
  it('round-trips revisions across consecutive saves without refetching', async () => {
    const revisions: unknown[] = [];
    let gets = 0;
    let revision = 7;
    server.use(
      http.get('*/api/data', () => {
        gets++;
        return HttpResponse.json({ ...buildData(), revision });
      }),
      http.post('*/api/data', async ({ request }) => {
        const body = await request.json() as { revision: number };
        revisions.push(body.revision);
        if (body.revision !== revision) return HttpResponse.json({ revision }, { status: 409 });
        return HttpResponse.json({ ok: true, revision: ++revision });
      }),
    );
    const { result } = renderHook(() => useProjectData('back-wall'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).not.toHaveProperty('revision');
    for (const name of ['first', 'second', 'third']) {
      await act(() => result.current.save(buildData({ name })));
    }
    expect(revisions).toEqual([7, 8, 9]);
    expect(result.current.data?.name).toBe('third');
    expect(result.current.saveError).toBeNull();
    expect(gets).toBe(1);
  });

  it('serializes POSTs and coalesces queued edits into the latest snapshot', async () => {
    const first = deferred();
    const second = deferred();
    const posts: { name: string; revision: number }[] = [];
    let active = 0;
    let maximum = 0;
    server.use(
      http.get('*/api/data', () => HttpResponse.json({ ...buildData(), revision: 7 })),
      http.post('*/api/data', async ({ request }) => {
        active++;
        maximum = Math.max(maximum, active);
        const body = await request.json() as { name: string; revision: number };
        posts.push(body);
        await (posts.length === 1 ? first.promise : second.promise);
        active--;
        return HttpResponse.json({ ok: true, revision: body.revision + 1 });
      }),
    );
    const { result } = renderHook(() => useProjectData('back-wall'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let saves!: Promise<void>[];
    act(() => { saves = [result.current.save(buildData({ name: 'first' }))]; });
    await waitFor(() => expect(posts).toHaveLength(1));
    act(() => {
      saves.push(result.current.save(buildData({ name: 'middle' })));
      saves.push(result.current.save(buildData({ name: 'latest' })));
    });
    expect(posts).toHaveLength(1);
    expect(result.current.data?.name).toBe('latest');
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false);
    first.resolve();
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(result.current.saving).toBe(true);
    expect(result.current.data?.name).toBe('latest');
    expect(posts.map(({ name, revision }) => ({ name, revision }))).toEqual([
      { name: 'first', revision: 7 }, { name: 'latest', revision: 8 },
    ]);
    second.resolve();
    await act(() => Promise.all(saves));
    expect(maximum).toBe(1);
    expect(result.current.saving).toBe(false);
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true);
  });

  it.each([409, 428])('HTTP %s preserves latest edits, rejects queued saves and blocks further saves until reload', async (status) => {
    const gate = deferred();
    let posts = 0;
    server.use(
      http.get('*/api/data', () => HttpResponse.json({ ...buildData(), revision: 9 })),
      http.post('*/api/data', async () => {
        posts++;
        await gate.promise;
        return HttpResponse.json({ revision: 10 }, { status });
      }),
    );
    const { result } = renderHook(() => useProjectData('back-wall'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let outcomes!: Promise<PromiseSettledResult<void>[]>;
    act(() => {
      outcomes = Promise.allSettled([
        result.current.save(buildData({ name: 'first' })),
        result.current.save(buildData({ name: 'unsaved latest' })),
      ]);
    });
    await waitFor(() => expect(posts).toBe(1));
    gate.resolve();
    await act(async () => {
      expect((await outcomes).map((r) => r.status)).toEqual(['rejected', 'rejected']);
    });
    expect(result.current.data?.name).toBe('unsaved latest');
    expect(result.current.saveError).toBe('conflict');
    expect(result.current.saving).toBe(false);
    await act(async () => {
      await expect(result.current.save(buildData({ name: 'still local' }))).rejects.toMatchObject({ status });
    });
    expect(posts).toBe(1);
    expect(result.current.data?.name).toBe('still local');
    await act(() => result.current.refetch());
    expect(result.current.data?.name).toBe('Back Wall');
    expect(result.current.saveError).toBeNull();
    server.use(http.post('*/api/data', async ({ request }) => {
      expect(await request.json()).toMatchObject({ revision: 9 });
      return HttpResponse.json({ ok: true, revision: 10 });
    }));
    await act(() => result.current.save(buildData({ name: 'reapplied' })));
    expect(result.current.saveError).toBeNull();
  });

  it.each([
    [401, 'unauthorized'], [403, 'forbidden'], [500, 'failed'], [0, 'failed'],
  ] as const)('surfaces %s without losing edits or reporting success', async (status, kind) => {
    server.use(http.post('*/api/data', () => status ? new HttpResponse(null, { status }) : HttpResponse.error()));
    const { result } = renderHook(() => useProjectData('back-wall'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await expect(result.current.save(buildData({ name: 'unsaved' }))).rejects.toThrow();
    });
    expect(result.current.data?.name).toBe('unsaved');
    expect(result.current.saveError).toBe(kind);
    expect(result.current.unsaved).toBe(true);
    expect(result.current.saving).toBe(false);
  });

  it('keeps project sessions separate when a previous save finishes after navigation', async () => {
    const gate = deferred();
    server.use(http.post('*/api/data', async () => {
      await gate.promise;
      return HttpResponse.json({ ok: true, revision: 8 });
    }));
    const { result, rerender } = renderHook(({ slug }) => useProjectData(slug), { initialProps: { slug: 'back-wall' } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let save!: Promise<void>;
    act(() => { save = result.current.save(buildData({ name: 'first project' })); });
    rerender({ slug: 'kitchen' });
    await waitFor(() => expect(result.current.data?.slug).toBe('kitchen'));
    gate.resolve();
    await act(() => save);
    expect(result.current.data?.slug).toBe('kitchen');
    rerender({ slug: 'back-wall' });
    await waitFor(() => expect(result.current.data?.name).toBe('Back Wall')); // clean remount refetches
  });
});


it('loads only once under StrictMode so a late GET cannot replace edits', async () => {
  let gets = 0;
  server.use(http.get('*/api/data', () => {
    gets++;
    return HttpResponse.json({ ...buildData(), revision: 7 });
  }));
  const { result } = renderHook(() => useProjectData('back-wall'), { wrapper: StrictProvider });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(gets).toBe(1);
});


it('isolates cached edits and unload protection when the API identity changes', async () => {
  server.use(
    http.get('*/api/data', () => HttpResponse.json({ ...buildData(), name: authSubject.sub, revision: 7 })),
    http.post('*/api/data', () => HttpResponse.json({ revision: 8 }, { status: 409 })),
  );
  const { result, rerender } = renderHook(() => useProjectData('back-wall'));
  await waitFor(() => expect(result.current.data?.name).toBe('owner'));
  await act(async () => {
    await expect(result.current.save(buildData({ name: 'private edits' }))).rejects.toThrow();
  });
  expect(result.current.unsaved).toBe(true);
  authSubject.sub = 'different-user';
  rerender();
  await waitFor(() => expect(result.current.data?.name).toBe('different-user'));
  expect(result.current.saveError).toBeNull();
  expect(result.current.unsaved).toBe(false);
  expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true);
});


it.each([8, undefined])('a late data response (%s) cannot overwrite a newer adopted revision', async (responseRevision) => {
  const gate = deferred();
  const revisions: unknown[] = [];
  server.use(
    http.get('*/api/data', () => HttpResponse.json({ ...buildData(), revision: 7 })),
    http.post('*/api/data', async ({ request }) => {
      const body = await request.json() as { revision: number };
      revisions.push(body.revision);
      if (revisions.length === 1) {
        await gate.promise;
        return HttpResponse.json({ ok: true, revision: responseRevision });
      }
      return HttpResponse.json({ ok: true, revision: 10 });
    }),
  );
  const { result } = renderHook(() => useProjectData('back-wall'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let first!: Promise<void>;
  let queued!: Promise<void>;
  act(() => { first = result.current.save(buildData()); });
  await waitFor(() => expect(revisions).toEqual([7]));
  act(() => {
    result.current.setRevision(9);
    queued = result.current.save(buildData({ name: 'latest' }));
  });
  gate.resolve();
  await act(() => Promise.all([first, queued]));
  expect(revisions).toEqual([7, 9]);
  expect(result.current.getRevision()).toBe(10);
});
