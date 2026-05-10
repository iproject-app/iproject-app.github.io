import { Link, useParams } from 'react-router-dom';
import { useProjectData } from '../lib/projectData';
import { AddExpenseForm } from '../components/AddExpenseForm';
import { Banner } from '../components/Banner';
import { ExpenseList } from '../components/ExpenseList';

export function ProjectView() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error, saving, save } = useProjectData(slug);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800"
      >
        ← All projects
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {data?.name ?? slug}
        </h1>
        {data && (
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
            {data.slug} · {data.expenses.length}{' '}
            {data.expenses.length === 1 ? 'entry' : 'entries'}
          </p>
        )}
      </header>

      {!loading && !error && data && (
        <section className="mt-6">
          <AddExpenseForm data={data} saving={saving} onAdd={save} />
        </section>
      )}

      <section className="mt-6">
        {loading && <Banner>Loading project…</Banner>}
        {!loading && error && (
          <Banner variant="error">
            <p className="font-medium">Couldn&rsquo;t load project.</p>
            <p className="mt-1 break-words text-rose-700/90">{error}</p>
          </Banner>
        )}
        {!loading && !error && data && data.expenses.length === 0 && (
          <Banner>No entries yet.</Banner>
        )}
        {!loading && !error && data && data.expenses.length > 0 && (
          <ExpenseList expenses={data.expenses} />
        )}
      </section>
    </div>
  );
}
