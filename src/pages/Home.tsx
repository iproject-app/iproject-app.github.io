import { useAuth0 } from '@auth0/auth0-react';
import { useProjects } from '../lib/projects';
import { Banner } from '../components/Banner';
import { ProjectCard } from '../components/ProjectCard';

export function Home() {
  const { user } = useAuth0();
  const { projects, loading, error } = useProjects();
  const greeting = user?.given_name ?? user?.nickname ?? user?.name ?? 'there';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-slate-500">Welcome back, {greeting}.</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Projects
        </h1>
      </header>

      <section className="mt-6">
        {loading && <Banner>Loading projects…</Banner>}
        {!loading && error && (
          <Banner variant="error">
            <p className="font-medium">Couldn&rsquo;t load projects.</p>
            <p className="mt-1 break-words text-rose-700/90">{error}</p>
          </Banner>
        )}
        {!loading && !error && projects && projects.length === 0 && (
          <Banner>No projects yet.</Banner>
        )}
        {!loading && !error && projects && projects.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.slug}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
