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
import {
  isDuplicateResponse,
  useProcessReceipt,
  type ProcessReceiptResponse,
} from './processReceipt';

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

const makeFile = (content = 'fake-image-bytes', name = 'r.jpg') =>
  new File([content], name, { type: 'image/jpeg' });

describe('useProcessReceipt', () => {
  it('POSTs base64-encoded file content to /api/process-receipt with the slug', async () => {
    interface CapturedBody {
      originalName?: string;
      contentBase64?: string;
    }
    let capturedBody: CapturedBody | null = null;
    let capturedUrl = '';
    server.use(
      http.post('*/api/process-receipt', async ({ request }) => {
        capturedUrl = request.url;
        capturedBody = (await request.json()) as CapturedBody;
        return HttpResponse.json({
          fields: { date: '2026-05-04', amount: 100 },
          filename: 'canonical.jpg',
        });
      }),
    );

    const { result } = renderHook(() => useProcessReceipt());
    const res = await result.current('back-wall', makeFile('hello'));

    expect(capturedUrl).toContain('project=back-wall');
    expect(capturedBody).not.toBeNull();
    const body = capturedBody as unknown as CapturedBody;
    expect(body.originalName).toBe('r.jpg');
    expect(body.contentBase64).toBeTruthy();
    // Base64 encoding of "hello" is "aGVsbG8=".
    expect(body.contentBase64).toBe('aGVsbG8=');

    expect('fields' in res).toBe(true);
    if ('fields' in res) {
      expect(res.filename).toBe('canonical.jpg');
      expect(res.fields.amount).toBe(100);
    }
  });

  it('returns the duplicate response shape unchanged', async () => {
    server.use(
      http.post('*/api/process-receipt', () =>
        HttpResponse.json({
          duplicate: {
            type: 'exact-file',
            filename: 'already.jpg',
            expense: {
              id: 'seed-01',
              date: '2026-05-04',
              category: 'Labor',
              payer: '',
              payee: 'Pedro',
              description: '',
              amount: 100,
            },
          },
        }),
      ),
    );

    const { result } = renderHook(() => useProcessReceipt());
    const res = await result.current('back-wall', makeFile());

    expect(isDuplicateResponse(res)).toBe(true);
    if (isDuplicateResponse(res)) {
      expect(res.duplicate.filename).toBe('already.jpg');
    }
  });

  it('rejects when the server returns a non-2xx response', async () => {
    server.use(
      http.post('*/api/process-receipt', () =>
        HttpResponse.json({ error: 'bad image' }, { status: 400 }),
      ),
    );

    const { result } = renderHook(() => useProcessReceipt());
    await expect(result.current('back-wall', makeFile())).rejects.toThrow(/400/);
  });

  it('discriminates ok vs duplicate via isDuplicateResponse', () => {
    const ok: ProcessReceiptResponse = {
      fields: {},
      filename: 'a.jpg',
    };
    const dup: ProcessReceiptResponse = {
      duplicate: {
        type: 'exact-file',
        filename: 'a.jpg',
        expense: {
          id: 'x',
          date: '2026-01-01',
          category: 'Other',
          payer: '',
          payee: 'p',
          description: '',
          amount: 1,
        },
      },
    };
    expect(isDuplicateResponse(ok)).toBe(false);
    expect(isDuplicateResponse(dup)).toBe(true);
  });
});
