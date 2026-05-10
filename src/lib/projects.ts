import { useEffect, useState } from 'react';
import { useApi } from './api';
import type { Project, ProjectListResponse } from './types';

interface State {
  projects: Project[] | null;
  loading: boolean;
  error: string | null;
}

export function useProjects(): State {
  const api = useApi();
  const [state, setState] = useState<State>({
    projects: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api<ProjectListResponse>('/api/projects')
      .then((res) => {
        if (cancelled) return;
        setState({ projects: res.projects, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load projects';
        setState({ projects: null, loading: false, error: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return state;
}
