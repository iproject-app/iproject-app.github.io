import { useEffect, useMemo, type ReactNode } from 'react';
import { useApi } from './api';
import { createProjectSessions, ProjectDataContext } from './projectData';

export function ProjectDataProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const sessions = useMemo(() => createProjectSessions(api), [api]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!sessions.hasUnsavedEdits()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [sessions]);

  return <ProjectDataContext.Provider value={sessions}>{children}</ProjectDataContext.Provider>;
}
