import type { Expense } from '../lib/types';
import { byCategory, byPayer, totalSpent } from '../lib/summaries';
import { categoryClass } from '../lib/categories';
import { formatMoney } from '../lib/format';
import { useTranslation } from '../i18n';

interface Props {
  expenses: Expense[];
}

export function SummaryTiles({ expenses }: Props) {
  const { t } = useTranslation();

  if (expenses.length === 0) return null;

  const total = totalSpent(expenses);
  const cats = byCategory(expenses);
  const payers = byPayer(expenses);

  return (
    <section
      aria-label={t('summary.totalSpent')}
      className="flex flex-col gap-4"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {t('summary.totalSpent')}
        </p>
        <p className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
          {formatMoney(total)}
        </p>
      </div>

      {cats.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('summary.byCategory')}
          </h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {cats.map((row) => (
              <li
                key={row.category}
                className={`rounded-xl px-3 py-2.5 text-sm ${categoryClass(row.category)}`}
              >
                <p className="truncate text-xs font-medium uppercase tracking-wide opacity-80">
                  {row.category}
                </p>
                <p className="mt-0.5 text-base font-semibold">
                  {formatMoney(row.total)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {payers.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('summary.byPayer')}
          </h3>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {payers.map((row) => (
              <li
                key={row.payer || '__unknown'}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="truncate text-slate-700">
                  {row.payer || (
                    <em className="not-italic text-slate-500">
                      {t('summary.unknownPayer')}
                    </em>
                  )}
                </span>
                <span className="font-medium text-slate-900">
                  {formatMoney(row.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
