import { Link, useParams } from 'react-router-dom';
import { useProjectData } from '../lib/projectData';
import type { Expense } from '../lib/types';

const formatMoney = (amount: number, currency = 'BRL') => {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  return amount.toLocaleString(locale, { style: 'currency', currency });
};

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const CATEGORY_PALETTE: Record<string, string> = {
  labor: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  materials: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  services: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  utilities: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  garbage: 'bg-stone-100 text-stone-700 ring-1 ring-stone-200',
  other: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

const categoryClass = (category: string) =>
  CATEGORY_PALETTE[category.toLowerCase()] ??
  'bg-slate-100 text-slate-700 ring-1 ring-slate-200';

export function ProjectView() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = useProjectData(slug);

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

      <section className="mt-6">
        {loading && <Banner variant="muted">Loading project…</Banner>}
        {!loading && error && (
          <Banner variant="error">
            <p className="font-medium">Couldn&rsquo;t load project.</p>
            <p className="mt-1 break-words text-rose-700/90">{error}</p>
          </Banner>
        )}
        {!loading && !error && data && data.expenses.length === 0 && (
          <Banner variant="muted">No entries yet.</Banner>
        )}
        {!loading && !error && data && data.expenses.length > 0 && (
          <ExpenseList expenses={data.expenses} />
        )}
      </section>
    </div>
  );
}

function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const sorted = [...expenses].sort((a, b) => {
    if (a.date === b.date) return a.id < b.id ? 1 : -1;
    return a.date < b.date ? 1 : -1;
  });

  return (
    <>
      <ul className="flex flex-col gap-3 sm:hidden">
        {sorted.map((e) => (
          <li key={e.id}>
            <ExpenseCard expense={e} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Payer → Payee</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {sorted.map((e) => (
              <ExpenseRow key={e.id} expense={e} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const isBill = expense.kind === 'bill';
  return (
    <tr className={isBill ? 'bg-amber-50/60' : undefined}>
      <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">
        {formatDate(expense.date)}
      </td>
      <td className="px-4 py-3 align-top">
        <span className="inline-flex items-center gap-1.5">
          <CategoryBadge category={expense.category} />
          {isBill && <BillBadge />}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-slate-700">
        <span className="block truncate" title={expense.payer || '—'}>
          {expense.payer || '—'}
        </span>
        <span
          className="block truncate text-xs text-slate-500"
          title={expense.payee}
        >
          → {expense.payee}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-slate-700">
        <span className="block max-w-prose">{expense.description}</span>
        {expense.receipt && <ReceiptLink filename={expense.receipt} />}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right align-top font-medium text-slate-900">
        {formatMoney(expense.amount, expense.currency)}
      </td>
    </tr>
  );
}

function ExpenseCard({ expense }: { expense: Expense }) {
  const isBill = expense.kind === 'bill';
  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${
        isBill ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{formatDate(expense.date)}</p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
            {expense.payee}
          </p>
          {expense.payer && (
            <p className="truncate text-xs text-slate-500">
              from {expense.payer}
            </p>
          )}
        </div>
        <p className="whitespace-nowrap text-right text-sm font-semibold text-slate-900">
          {formatMoney(expense.amount, expense.currency)}
        </p>
      </div>
      <p className="mt-2 text-sm text-slate-700">{expense.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <CategoryBadge category={expense.category} />
        {isBill && <BillBadge />}
        {expense.receipt && <ReceiptLink filename={expense.receipt} />}
      </div>
    </article>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryClass(category)}`}
    >
      {category}
    </span>
  );
}

function BillBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
      Bill
    </span>
  );
}

function ReceiptLink({ filename }: { filename: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M3 2h7l3 3v9H3V2z" strokeLinejoin="round" />
        <path d="M10 2v3h3" strokeLinejoin="round" />
      </svg>
      <span className="truncate" title={filename}>
        receipt
      </span>
    </span>
  );
}

function Banner({
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
