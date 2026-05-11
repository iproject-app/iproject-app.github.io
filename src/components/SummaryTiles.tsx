import { useState } from 'react';
import type { Expense } from '../lib/types';
import { byCategory, byPayer, totalSpent } from '../lib/summaries';
import { totalOutstanding } from '../lib/bills';
import { categoryClass } from '../lib/categories';
import { formatMoney } from '../lib/format';
import { useTranslation } from '../i18n';

interface Props {
  expenses: Expense[];
  /** Project's labor budget (plannedLabor). Shown as the "Contract" tile. */
  plannedLabor?: number;
  /** When set, the by-payer row matching this string renders selected; clicks
   *  toggle the selection via `onPayerSelect`. Use the literal '__unknown' for
   *  the empty-payer bucket to mirror FilterBar's encoding. */
  selectedPayer?: string;
  onPayerSelect?: (payer: string) => void;
}

export function SummaryTiles({
  expenses,
  plannedLabor,
  selectedPayer,
  onPayerSelect,
}: Props) {
  const { t } = useTranslation();
  const [payersOpen, setPayersOpen] = useState(true);

  if (expenses.length === 0 && !plannedLabor) return null;

  const spent = totalSpent(expenses);
  const outstanding = totalOutstanding(expenses);
  const cats = byCategory(expenses);
  const payers = byPayer(expenses);

  const hasHero = Boolean(plannedLabor) || spent > 0 || outstanding > 0;

  return (
    <section
      aria-label={t('summary.totalSpent')}
      className="flex flex-col gap-4"
    >
      {hasHero && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {plannedLabor != null && plannedLabor > 0 && (
            <HeroTile
              label={t('summary.contract')}
              value={formatMoney(plannedLabor)}
              tone="brand"
            />
          )}
          <HeroTile
            label={t('summary.totalSpent')}
            value={formatMoney(spent)}
            tone="neutral"
          />
          {outstanding > 0 && (
            <HeroTile
              label={t('billing.outstanding')}
              value={formatMoney(outstanding)}
              tone="amber"
            />
          )}
        </div>
      )}

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
                  {t('summary.paidOnLabel', { category: row.category })}
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
          <button
            type="button"
            onClick={() => setPayersOpen((v) => !v)}
            aria-expanded={payersOpen}
            aria-controls="summary-by-payer"
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            <span>{t('summary.byPayer')}</span>
            <Chevron open={payersOpen} />
          </button>
          {payersOpen && (
            <ul
              id="summary-by-payer"
              className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {payers.map((row) => {
                const key = row.payer || '__unknown';
                const isSelected = selectedPayer === key;
                const className = `flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                  isSelected
                    ? 'bg-brand-50 text-brand-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`;
                const content = (
                  <>
                    <span className="truncate">
                      {row.payer || (
                        <em className="not-italic text-slate-500">
                          {t('summary.unknownPayer')}
                        </em>
                      )}
                    </span>
                    <span className="font-medium text-slate-900">
                      {formatMoney(row.total)}
                    </span>
                  </>
                );
                if (onPayerSelect) {
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() =>
                          onPayerSelect(isSelected ? '' : key)
                        }
                        aria-pressed={isSelected}
                        className={className}
                      >
                        {content}
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={key} className={className}>
                    {content}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function HeroTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'brand' | 'neutral' | 'amber';
}) {
  const styles =
    tone === 'brand'
      ? 'border-brand-200 bg-brand-50 text-brand-900'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-slate-200 bg-white text-slate-900';
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${styles}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold sm:text-3xl">{value}</p>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
