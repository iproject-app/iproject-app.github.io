import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../lib/projects';
import { useTranslation } from '../i18n';
import { Banner } from '../components/Banner';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { ProjectCard } from '../components/ProjectCard';

export function Home() {
  const { user } = useAuth0();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects, loading, error } = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const greeting = user?.given_name ?? user?.nickname ?? user?.name ?? 'there';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-500">
            {t('home.welcome', { name: greeting })}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {t('home.projects')}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          {t('home.newProject')}
        </button>
      </header>

      <section className="mt-6">
        {loading && <Banner>{t('home.loadingProjects')}</Banner>}
        {!loading && error && (
          <Banner variant="error">
            <p className="font-medium">{t('home.errorLoadingProjects')}</p>
            <p className="mt-1 break-words text-rose-700/90">{error}</p>
          </Banner>
        )}
        {!loading && !error && projects && projects.length === 0 && (
          <Banner>{t('home.noProjects')}</Banner>
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

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setCreateOpen(false);
          navigate(`/projects/${created.slug}`);
        }}
      />
    </div>
  );
}
