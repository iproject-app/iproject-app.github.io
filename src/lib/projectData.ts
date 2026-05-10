import { useEffect, useState } from 'react';
import { useApi } from './api';
import type { ProjectData } from './types';

interface State {
  data: ProjectData | null;
  loading: boolean;
  error: string | null;
}

export function useProjectData(slug: string | undefined): State {
  const api = useApi();
  const [state, setState] = useState<State>({
    data: null,
    loading: Boolean(slug),
    error: null,
  });

  useEffect(() => {
    if (!slug) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api<ProjectData>(`/api/data?project=${encodeURIComponent(slug)}`)
      .then((data) => {
        if (cancelled) return;
        setState({ data, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load project';
        setState({ data: null, loading: false, error: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [api, slug]);

  return state;
}
