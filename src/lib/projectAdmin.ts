import { useCallback } from 'react';
import { useApi } from './api';

export interface CreatedProject {
  slug: string;
  name: string;
}

/** POST /api/projects { name } → { slug, name } */
export function useCreateProject() {
  const api = useApi();
  return useCallback(
    async (name: string): Promise<CreatedProject> =>
      api<CreatedProject>('/api/projects', {
        method: 'POST',
        body: { name },
      }),
    [api],
  );
}

/** POST /api/projects/<slug>/rename { name } → { slug, name } */
export function useRenameProject() {
  const api = useApi();
  return useCallback(
    async (slug: string, name: string): Promise<CreatedProject> =>
      api<CreatedProject>(
        `/api/projects/${encodeURIComponent(slug)}/rename`,
        {
          method: 'POST',
          body: { name },
        },
      ),
    [api],
  );
}

export interface DeletedProject {
  slug: string;
  trashed: string;
}

/** POST /api/projects/<slug>/delete → { slug, trashed }. Server moves the
 *  project tree into projects/.trash/<slug>-<timestamp> so the action is
 *  reversible on the cluster's filesystem. */
export function useDeleteProject() {
  const api = useApi();
  return useCallback(
    async (slug: string): Promise<DeletedProject> =>
      api<DeletedProject>(
        `/api/projects/${encodeURIComponent(slug)}/delete`,
        { method: 'POST' },
      ),
    [api],
  );
}
