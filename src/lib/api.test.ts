import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse, makeServer } from '../test/msw';
import { ApiError, apiRequest } from './api';

const server = makeServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('apiRequest', () => {
  it.each([400, 401, 403, 404, 409, 428, 500, 503])('rejects HTTP %s even with an ok body', async (status) => {
    server.use(http.post('*/api/data', () => HttpResponse.json({ ok: true, revision: 9 }, { status })));
    await expect(apiRequest('/api/data', 'token', { method: 'POST', body: {} }))
      .rejects.toMatchObject({ status, body: { ok: true, revision: 9 } });
  });

  it('rejects non-JSON errors', async () => {
    server.use(http.post('*/api/data', () => new HttpResponse('Unavailable', { status: 502 })));
    await expect(apiRequest('/api/data', null, { method: 'POST' })).rejects.toBeInstanceOf(ApiError);
  });

  it('rejects network errors', async () => {
    server.use(http.post('*/api/data', () => HttpResponse.error()));
    await expect(apiRequest('/api/data', null, { method: 'POST' })).rejects.toThrow();
  });

  it('accepts success and sends JSON with authentication', async () => {
    server.use(http.post('*/api/data', async ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer token');
      expect(request.headers.get('content-type')).toBe('application/json');
      expect(await request.json()).toEqual({ revision: 7 });
      return HttpResponse.json({ ok: true, revision: 8 });
    }));
    await expect(apiRequest('/api/data', 'token', { method: 'POST', body: { revision: 7 } }))
      .resolves.toEqual({ ok: true, revision: 8 });
  });
});
