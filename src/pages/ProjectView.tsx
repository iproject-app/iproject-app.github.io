import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProjectData } from '../lib/projectData';
import { totalOutstanding } from '../lib/bills';
import { useTranslation } from '../i18n';
import { AddExpenseForm } from '../components/AddExpenseForm';
import { Banner } from '../components/Banner';
import { ExpenseDetailModal } from '../components/ExpenseDetailModal';
import { ExpenseList } from '../components/ExpenseList';
import {
  applyFilters,
  FilterBar,
  initialFilters,
  type ExpenseFilters,
} from '../components/FilterChips';
import { OutstandingPill } from '../components/OutstandingPill';
import { SettingsModal } from '../components/SettingsModal';
import { SummaryTiles } from '../components/SummaryTiles';
import type { Expense } from '../lib/types';

/** Distinct payers and categories present on a project's expenses, for the
 *  filter dropdowns. Sorted to keep the UI stable across re-renders. */
function distinctValues(expenses: Expense[]): {
  payers: string[];
  categories: string[];
} {
  const payers = new Set<string>();
  const categories = new Set<string>();
  for (const e of expenses) {
    payers.add(e.payer ?? '');
    categories.add(e.category ?? '');
  }
  return {
    payers: [...payers].sort((a, b) => (a || '').localeCompare(b || '')),
    categories: [...categories]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
  };
}

export function ProjectView() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { data, loading, error, saving, save } = useProjectData(slug);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filters, setFilters] = useState<ExpenseFilters>(initialFilters);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const entriesLabel = data
    ? t(
        data.expenses.length === 1
          ? 'project.entriesCountSingular'
          : 'project.entriesCountPlural',
        { count: data.expenses.length },
      )
    : '';

  const outstanding = data ? totalOutstanding(data.expenses) : 0;
  const { payers, categories } = useMemo(
    () => distinctValues(data?.expenses ?? []),
    [data?.expenses],
  );
  const visibleExpenses = useMemo(
    () => (data ? applyFilters(data.expenses, filters) : []),
    [data, filters],
  );

  const setPayerFilter = (next: string) =>
    setFilters((f) => ({ ...f, payer: next }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-start justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800"
        >
          {t('project.backToList')}
        </Link>
        {data && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('settings.title')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <GearIcon />
          </button>
        )}
      </div>

      <header className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {data?.name ?? slug}
          </h1>
          {data && outstanding > 0 && <OutstandingPill amount={outstanding} />}
        </div>
        {data && (
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {data.slug} · {entriesLabel}
          </p>
        )}
      </header>

      {!loading && !error && data && (data.expenses.length > 0 || data.plannedLabor) && (
        <section className="mt-6">
          <SummaryTiles
            expenses={data.expenses}
            plannedLabor={data.plannedLabor}
            contractData={data}
            selectedPayer={filters.payer}
            onPayerSelect={setPayerFilter}
          />
        </section>
      )}

      {!loading && !error && data && (
        <section className="mt-6">
          <AddExpenseForm data={data} saving={saving} onAdd={save} />
        </section>
      )}

      <section className="mt-6 flex flex-col gap-4">
        {!loading && !error && data && data.expenses.length > 0 && (
          <FilterBar
            value={filters}
            onChange={setFilters}
            payers={payers}
            categories={categories}
          />
        )}

        {loading && <Banner>{t('project.loading')}</Banner>}
        {!loading && error && (
          <Banner variant="error">
            <p className="font-medium">{t('project.errorLoading')}</p>
            <p className="mt-1 break-words text-rose-700/90">{error}</p>
          </Banner>
        )}
        {!loading && !error && data && data.expenses.length === 0 && (
          <Banner>{t('project.noEntries')}</Banner>
        )}
        {!loading && !error && data && data.expenses.length > 0 && (
          <ExpenseList expenses={visibleExpenses} onRowClick={setEditing} />
        )}
      </section>

      {data && (
        <ExpenseDetailModal
          expense={editing}
          data={data}
          saving={saving}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}

      {data && (
        <SettingsModal
          open={settingsOpen}
          data={data}
          saving={saving}
          onSave={save}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.02 1.55V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1.02H3a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.02-1.55V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1.02 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9V9c.36.69.99 1.11 1.55 1.11H21a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.55 1.02z"
      />
    </svg>
  );
}
