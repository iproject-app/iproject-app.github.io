import { useState } from 'react';
import type { Expense } from '../lib/types';
import {
  byCategory,
  byPayer,
  paidOnCategory,
  totalSpent,
} from '../lib/summaries';
import { totalOutstanding } from '../lib/bills';
import { categoryClass } from '../lib/categories';
import { formatDate, formatMoney } from '../lib/format';
import {
  nextPayment,
  nextPaymentDue,
  paymentsRemaining,
  schedule,
} from '../lib/schedule';
import type { ProjectData } from '../lib/types';
import { useTranslation } from '../i18n';

const LABOR_CATEGORY = 'Labor';

/** Floating-point safety: two amounts are "equal" if they're within a cent. */
const within = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

const overBudget = (a: number, b: number, eps = 0.01) => a - b > eps;

interface Props {
  expenses: Expense[];
  /** Project's labor budget (plannedLabor). Shown as the "Contract" tile. */
  plannedLabor?: number;
  /** When set, the Contract tile gets a small "Next: <amount> on <date>"
   *  subline pulled from the schedule helpers. */
  contractData?: ProjectData;
  /** When set, the by-payer row matching this string renders selected; clicks
   *  toggle the selection via `onPayerSelect`. Use the literal '__unknown' for
   *  the empty-payer bucket to mirror FilterBar's encoding. */
  selectedPayer?: string;
  onPayerSelect?: (payer: string) => void;
}

export function SummaryTiles({
  expenses,
  plannedLabor,
  contractData,
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

  // Contract vs. paid-on-labor status drives the tone of two tiles:
  //   under-paid  → Contract turns rose (debt-like signal)
  //   at-budget   → Contract turns emerald (settled)
  //   over-budget → Contract emerald, Paid on Labor rose (overage warning)
  const paidOnLabor = paidOnCategory(expenses, LABOR_CATEGORY);
  const hasBudget = plannedLabor != null && plannedLabor > 0;
  const isOverBudget = hasBudget && overBudget(paidOnLabor, plannedLabor!);
  const contractTone: 'rose' | 'emerald' | 'brand' = !hasBudget
    ? 'brand'
    : within(paidOnLabor, plannedLabor!) || isOverBudget
      ? 'emerald'
      : 'rose';

  const overBudgetTileClass =
    'bg-rose-50 text-rose-800 ring-1 ring-rose-200';

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
              tone={contractTone}
              footer={contractData ? renderNextPayment(contractData, t) : null}
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
            {cats.map((row) => {
              const isLaborOver =
                isOverBudget &&
                row.category.toLowerCase() === LABOR_CATEGORY.toLowerCase();
              const tileClass = isLaborOver
                ? overBudgetTileClass
                : categoryClass(row.category);
              return (
                <li
                  key={row.category}
                  className={`rounded-xl px-3 py-2.5 text-sm ${tileClass}`}
                >
                  <p className="truncate text-xs font-medium uppercase tracking-wide opacity-80">
                    {t('summary.paidOnLabel', { category: row.category })}
                  </p>
                  <p className="mt-0.5 text-base font-semibold">
                    {formatMoney(row.total)}
                  </p>
                </li>
              );
            })}
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

type HeroTone = 'brand' | 'neutral' | 'amber' | 'rose' | 'emerald';

const HERO_TONE_CLASS: Record<HeroTone, string> = {
  brand: 'border-brand-200 bg-brand-50 text-brand-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  rose: 'border-rose-200 bg-rose-50 text-rose-900',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  neutral: 'border-slate-200 bg-white text-slate-900',
};

function HeroTile({
  label,
  value,
  tone,
  footer,
}: {
  label: string;
  value: string;
  tone: HeroTone;
  footer?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${HERO_TONE_CLASS[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold sm:text-3xl">{value}</p>
      {footer && <div className="mt-2 text-xs opacity-80">{footer}</div>}
    </div>
  );
}

function renderNextPayment(
  data: ProjectData,
  t: (
    key:
      | 'contract.nextPayment'
      | 'contract.allComplete'
      | 'contract.paymentsRemaining',
    vars?: Record<string, string | number>,
  ) => string,
): React.ReactNode {
  if (schedule(data).length === 0) return null;
  const next = nextPayment(data);
  if (!next) return <span>{t('contract.allComplete')}</span>;
  // "Next" amount is the catch-up against the cumulative schedule, not a
  // raw weekly division — so the dashboard tells you what to actually pay
  // given everything that's already been paid on Labor.
  const labored = paidOnCategory(data.expenses, 'Labor');
  const due = nextPaymentDue(data, labored);
  const remaining = paymentsRemaining(data);
  return (
    <span>
      {t('contract.nextPayment', {
        amount: formatMoney(due),
        date: formatDate(next.date),
      })}
      {' · '}
      {t('contract.paymentsRemaining', { count: remaining })}
    </span>
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
