import type { Expense } from '../lib/types';
import { ExpenseCard } from './ExpenseCard';
import { ExpenseRow } from './ExpenseRow';

interface Props {
  expenses: Expense[];
}

/** Newest first; stable tie-break by id descending. */
export function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => {
    if (a.date === b.date) return a.id < b.id ? 1 : -1;
    return a.date < b.date ? 1 : -1;
  });
}

export function ExpenseList({ expenses }: Props) {
  const sorted = sortExpenses(expenses);

  return (
    <>
      <ul className="flex flex-col gap-3 sm:hidden" aria-label="Expenses">
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
