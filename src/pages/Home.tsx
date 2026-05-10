import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import { useProjects } from '../lib/projects';
import type { Project } from '../lib/types';

const formatBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
        {loading && <Card variant="muted">Loading projects…</Card>}
        {!loading && error && (
          <Card variant="error">
            <p className="font-medium">Couldn&rsquo;t load projects.</p>
            <p className="mt-1 break-words text-rose-700/90">{error}</p>
          </Card>
        )}
        {!loading && !error && projects && projects.length === 0 && (
          <Card variant="muted">No projects yet.</Card>
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

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.slug}`}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:p-6"
    >
      <h2 className="text-lg font-semibold text-slate-900">{project.name}</h2>
      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
        {project.slug}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Expenses</dt>
          <dd className="font-medium text-slate-900">{project.expenseCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Total</dt>
          <dd className="font-medium text-slate-900">{formatBRL(project.total)}</dd>
        </div>
      </dl>
    </Link>
  );
}

function Card({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: 'muted' | 'error';
}) {
  const styles =
    variant === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-slate-200 bg-white text-slate-500 shadow-sm';
  return (
    <div className={`rounded-2xl border p-5 text-sm sm:p-6 ${styles}`}>
      {children}
    </div>
  );
}
