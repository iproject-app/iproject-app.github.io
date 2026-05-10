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
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse, makeServer } from '../test/msw';
import { useReceiptUrl } from './useReceiptUrl';

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

// jsdom's URL.createObjectURL is undefined; stub it so the hook can produce
// a usable string. The exact value doesn't matter for these tests — we just
// need to confirm one is set on success and revoked on cleanup.
let lastBlob: Blob | null = null;
let revoked: string[] = [];

beforeEach(() => {
  lastBlob = null;
  revoked = [];
  let counter = 0;
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob) => {
      lastBlob = blob;
      counter += 1;
      return `blob:test/${counter}`;
    },
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: (u: string) => {
      revoked.push(u);
    },
  });
});

describe('useReceiptUrl', () => {
  it('returns idle state when filename or slug is missing', () => {
    const { result } = renderHook(() => useReceiptUrl(undefined, 'back-wall'));
    expect(result.current).toEqual({
      url: null,
      contentType: null,
      loading: false,
      error: null,
    });
  });

  it('fetches the receipt and exposes a blob URL on success', async () => {
    server.use(
      http.get('*/receipts/r.jpg', () =>
        HttpResponse.arrayBuffer(new Uint8Array([1, 2, 3]).buffer, {
          headers: { 'content-type': 'image/jpeg' },
        }),
      ),
    );

    const { result } = renderHook(() => useReceiptUrl('r.jpg', 'back-wall'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.url).toMatch(/^blob:test\//);
    expect(result.current.contentType).toBe('image/jpeg');
    expect(result.current.error).toBeNull();
    // instanceof check is unreliable because MSW's Blob comes from undici
    // (Node) and the test scope's Blob is jsdom's — different prototypes.
    // Verify the structural shape instead.
    expect(lastBlob).not.toBeNull();
    expect(lastBlob).toMatchObject({ size: 3, type: 'image/jpeg' });
  });

  it('attaches Authorization: Bearer when authenticated', async () => {
    let received: string | null = null;
    server.use(
      http.get('*/receipts/r.jpg', ({ request }) => {
        received = request.headers.get('authorization');
        return HttpResponse.arrayBuffer(new Uint8Array([0]).buffer);
      }),
    );

    const { result } = renderHook(() => useReceiptUrl('r.jpg', 'back-wall'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(received).toBe('Bearer fake-token');
  });

  it('reports the error message on a 404', async () => {
    server.use(
      http.get('*/receipts/missing.jpg', () =>
        new HttpResponse(null, { status: 404 }),
      ),
    );

    const { result } = renderHook(() =>
      useReceiptUrl('missing.jpg', 'back-wall'),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.url).toBeNull();
    expect(result.current.error).toMatch(/404/);
  });

  it('revokes the object URL when filename changes', async () => {
    server.use(
      http.get('*/receipts/*', () =>
        HttpResponse.arrayBuffer(new Uint8Array([0]).buffer),
      ),
    );

    const { result, rerender } = renderHook(
      ({ name }: { name: string }) => useReceiptUrl(name, 'back-wall'),
      { initialProps: { name: 'a.jpg' } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const firstUrl = result.current.url!;

    rerender({ name: 'b.jpg' });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(revoked).toContain(firstUrl);
  });
});
