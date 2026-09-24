import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { useApi } from './api';
import { requiresReload, saveErrorKind, type SaveError } from './saveErrors';
import type { ProjectData } from './types';

interface State {
  data: ProjectData | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: SaveError | null;
  unsaved: boolean;
}

/** Each project owns its revision and one drain promise. Callers arriving while
 * a POST is pending replace the queued snapshot and wait for the entire drain.
 * Never refetch after a save: a GET could overwrite edits made during the POST. */
function projectSession(api: ReturnType<typeof useApi>, slug: string | undefined) {
  let state: State = {
    data: null,
    loading: Boolean(slug),
    error: null,
    saving: false,
    saveError: null,
    unsaved: false,
  };
  let revision: number | undefined;
  let pending: ProjectData | null = null;
  let running: Promise<void> | null = null;
  let blocked: unknown = null;
  let loaded = false;
  let started = false;
  let loadId = 0;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<State>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const path = `/api/data?project=${encodeURIComponent(slug ?? '')}`;

  const refetch = async () => {
    if (!slug) return;
    // Explicit reloads cannot race the previous write or its revision update.
    if (running) await running.catch(() => undefined);
    const id = ++loadId;
    update({ loading: true, error: null });
    try {
      const { revision: nextRevision, ...data } = await api<
        ProjectData & { revision?: number }
      >(path);
      if (id !== loadId) return;
      revision = nextRevision;
      blocked = null;
      loaded = true;
      update({ data, loading: false, error: null, saveError: null, unsaved: false });
    } catch (error) {
      if (id !== loadId) return;
      update({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load project',
      });
    }
  };

  const drain = async () => {
    update({ saving: true, saveError: null });
    try {
      while (pending) {
        const next = pending;
        pending = null;
        const response = await api<{ revision?: number }>(path, {
          method: 'POST',
          body: { ...next, ...(revision === undefined ? {} : { revision }) },
        });
        revision = response?.revision;
      }
      update({ unsaved: false });
    } catch (error) {
      pending = null;
      const kind = saveErrorKind(error);
      if (requiresReload(kind)) blocked = error;
      update({ saveError: kind });
      throw error;
    } finally {
      running = null;
      update({ saving: false });
    }
  };

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    load: () => {
      if (!started) {
        started = true;
        void refetch();
      }
    },
    refetch,
    setRevision: (nextRevision: number | undefined) => {
      // Old rename responses omit revision. Never erase a known revision.
      if (nextRevision !== undefined) revision = nextRevision;
    },
    save: async (next: ProjectData) => {
      if (!slug || !loaded || state.loading) throw new Error('No project loaded.');
      // Keep even rejected edits available on screen; only explicit reload
      // replaces them with server data. A conflict revision is never adopted.
      update({ data: next, unsaved: true });
      if (blocked) throw blocked;
      pending = next;
      running ??= drain();
      await running;
    },
  };
}

/** Owned by the app provider, not ProjectView, so navigation retains drafts. */
export function createProjectSessions(api: ReturnType<typeof useApi>) {
  const sessions = new Map<string | undefined, ReturnType<typeof projectSession>>();
  return {
    get: (slug: string | undefined) => {
      let session = sessions.get(slug);
      if (!session) {
        session = projectSession(api, slug);
        sessions.set(slug, session);
      }
      return session;
    },
    hasUnsavedEdits: () => [...sessions.values()].some((session) => session.getSnapshot().unsaved),
  };
}

export const ProjectDataContext = createContext<ReturnType<typeof createProjectSessions> | null>(null);

export function useProjectData(slug: string | undefined) {
  const sessions = useContext(ProjectDataContext);
  if (!sessions) throw new Error('useProjectData requires ProjectDataProvider');
  const session = useMemo(() => sessions.get(slug), [sessions, slug]);
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => {
    session.load();
  }, [session]);
  return { ...state, save: session.save, refetch: session.refetch, setRevision: session.setRevision };
}
