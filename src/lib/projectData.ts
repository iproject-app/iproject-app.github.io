import { useCallback, useEffect, useState } from 'react';
import { useApi } from './api';
import type { ProjectData } from './types';

interface State {
  data: ProjectData | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

interface Result extends State {
  refetch: () => Promise<void>;
  save: (next: ProjectData) => Promise<void>;
}

export function useProjectData(slug: string | undefined): Result {
  const api = useApi();
  const [state, setState] = useState<State>({
    data: null,
    loading: Boolean(slug),
    error: null,
    saving: false,
  });

  const fetchData = useCallback(async () => {
    if (!slug) {
      setState({ data: null, loading: false, error: null, saving: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api<ProjectData>(
        `/api/data?project=${encodeURIComponent(slug)}`,
      );
      setState({ data, loading: false, error: null, saving: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load project';
      setState({ data: null, loading: false, error: msg, saving: false });
    }
  }, [api, slug]);

  useEffect(() => {
    let cancelled = false;
    void fetchData().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const save = useCallback(
    async (next: ProjectData) => {
      if (!slug) throw new Error('No project loaded.');
      setState((s) => ({ ...s, saving: true, error: null }));
      try {
        await api<{ ok: true }>(`/api/data?project=${encodeURIComponent(slug)}`, {
          method: 'POST',
          body: next,
        });
        // Reflect the saved state immediately; refetch in background to pick
        // up server-side normalizations (e.g. trashed receipts list).
        setState((s) => ({ ...s, data: next, saving: false }));
        void fetchData();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Save failed';
        setState((s) => ({ ...s, saving: false, error: msg }));
        throw e;
      }
    },
    [api, slug, fetchData],
  );

  return { ...state, refetch: fetchData, save };
}
