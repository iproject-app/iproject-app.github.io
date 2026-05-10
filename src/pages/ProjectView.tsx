import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProjectData } from '../lib/projectData';
import { totalOutstanding } from '../lib/bills';
import { useTranslation } from '../i18n';
import { AddExpenseForm } from '../components/AddExpenseForm';
import { Banner } from '../components/Banner';
import { ContactsModal } from '../components/ContactsModal';
import { ExpenseDetailModal } from '../components/ExpenseDetailModal';
import { ExpenseList } from '../components/ExpenseList';
import {
  applyFilter,
  FilterChips,
  type ExpenseFilter,
} from '../components/FilterChips';
import { OutstandingPill } from '../components/OutstandingPill';
import { SummaryTiles } from '../components/SummaryTiles';
import type { Expense } from '../lib/types';

export function ProjectView() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { data, loading, error, saving, save } = useProjectData(slug);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<ExpenseFilter>('all');
  const [contactsOpen, setContactsOpen] = useState(false);

  const entriesLabel = data
    ? t(
        data.expenses.length === 1
          ? 'project.entriesCountSingular'
          : 'project.entriesCountPlural',
        { count: data.expenses.length },
      )
    : '';

  const outstanding = data ? totalOutstanding(data.expenses) : 0;
  const visibleExpenses = data ? applyFilter(data.expenses, filter) : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800"
      >
        {t('project.backToList')}
      </Link>

      <header className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {data?.name ?? slug}
          </h1>
          {data && outstanding > 0 && <OutstandingPill amount={outstanding} />}
          {data && (
            <button
              type="button"
              onClick={() => setContactsOpen(true)}
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              {t('contacts.button', { count: (data.contacts ?? []).length })}
            </button>
          )}
        </div>
        {data && (
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {data.slug} · {entriesLabel}
          </p>
        )}
      </header>

      {!loading && !error && data && data.expenses.length > 0 && (
        <section className="mt-6">
          <SummaryTiles expenses={data.expenses} />
        </section>
      )}

      {!loading && !error && data && (
        <section className="mt-6">
          <AddExpenseForm data={data} saving={saving} onAdd={save} />
        </section>
      )}

      <section className="mt-6 flex flex-col gap-4">
        {!loading && !error && data && data.expenses.length > 0 && (
          <FilterChips value={filter} onChange={setFilter} />
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
        <ContactsModal
          open={contactsOpen}
          data={data}
          saving={saving}
          onSave={save}
          onClose={() => setContactsOpen(false)}
        />
      )}
    </div>
  );
}
