import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

interface State {
  /** Object URL pointing at the fetched receipt; null until loaded. */
  url: string | null;
  /** Resolved content type from the response, when known. */
  contentType: string | null;
  loading: boolean;
  error: string | null;
}

const empty: State = { url: null, contentType: null, loading: false, error: null };

/**
 * Fetch a receipt as a Bearer-authenticated request and expose it via an
 * object URL that's safe to assign to `<img src>` or `<a href>`.
 *
 * The browser can't add an Authorization header to `<img>`, so we have to
 * fetch with credentials, blob the response, and revoke the resulting URL on
 * unmount or filename change. When auth is disabled (no audience configured)
 * `getAccessTokenSilently` returns nothing useful; in that case we just call
 * the endpoint without an Authorization header — the server's stub-identity
 * mode accepts the request.
 */
export function useReceiptUrl(
  filename: string | undefined,
  slug: string | undefined,
): State {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [state, setState] = useState<State>(empty);

  useEffect(() => {
    if (!filename || !slug) {
      setState(empty);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;
    setState({ url: null, contentType: null, loading: true, error: null });

    const load = async () => {
      let token: string | null = null;
      if (isAuthenticated) {
        try {
          token = await getAccessTokenSilently();
        } catch {
          token = null;
        }
      }
      const url = `${baseUrl}/receipts/${encodeURIComponent(filename)}?project=${encodeURIComponent(slug)}`;
      const headers = new Headers();
      if (token) headers.set('authorization', `Bearer ${token}`);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Receipt request failed: ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      createdUrl = objectUrl;
      if (!cancelled) {
        setState({
          url: objectUrl,
          contentType: res.headers.get('content-type'),
          loading: false,
          error: null,
        });
      }
    };

    load().catch((e: unknown) => {
      if (cancelled) return;
      const msg = e instanceof Error ? e.message : 'Failed to load receipt';
      setState({ url: null, contentType: null, loading: false, error: msg });
    });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [filename, slug, isAuthenticated, getAccessTokenSilently]);

  return state;
}
