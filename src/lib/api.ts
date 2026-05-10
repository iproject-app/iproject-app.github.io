import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  token: string | null,
  { body, headers, ...rest }: ApiRequestOptions = {},
): Promise<T> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const finalHeaders = new Headers(headers);
  if (body !== undefined && !finalHeaders.has('content-type')) {
    finalHeaders.set('content-type', 'application/json');
  }
  if (token) finalHeaders.set('authorization', `Bearer ${token}`);

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(`Request failed: ${res.status}`, res.status, parsed);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * React hook returning a function that issues an authenticated API request
 * using the current Auth0 access token. The token is fetched lazily per call.
 */
export function useApi() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  return useCallback(
    async <T,>(path: string, options?: ApiRequestOptions): Promise<T> => {
      const token = isAuthenticated ? await getAccessTokenSilently() : null;
      return apiRequest<T>(path, token, options);
    },
    [getAccessTokenSilently, isAuthenticated],
  );
}
