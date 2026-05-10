import { Link } from 'react-router-dom';
import type { Project } from '../lib/types';
import { formatMoney } from '../lib/format';
import { useTranslation } from '../i18n';

interface Props {
  project: Project;
}

export function ProjectCard({ project }: Props) {
  const { t } = useTranslation();
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
          <dt className="text-slate-500">{t('home.expenses')}</dt>
          <dd className="font-medium text-slate-900">{project.expenseCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('home.total')}</dt>
          <dd className="font-medium text-slate-900">
            {formatMoney(project.total)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
