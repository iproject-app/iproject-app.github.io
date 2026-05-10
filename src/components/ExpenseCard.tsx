import type { Expense } from '../lib/types';
import { formatDate, formatMoney } from '../lib/format';
import { CategoryBadge } from './CategoryBadge';
import { BillBadge } from './BillBadge';
import { ReceiptLink } from './ReceiptLink';

interface Props {
  expense: Expense;
  onClick?: (expense: Expense) => void;
}

export function ExpenseCard({ expense, onClick }: Props) {
  const isBill = expense.kind === 'bill';
  const baseClass = `rounded-2xl border p-4 shadow-sm text-left transition ${
    isBill ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
  }`;
  const interactiveClass = onClick
    ? ' w-full hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
    : '';

  const body = (
    <>
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
      {expense.description && (
        <p className="mt-2 text-sm text-slate-700">{expense.description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <CategoryBadge category={expense.category} />
        {isBill && <BillBadge />}
        {expense.receipt && <ReceiptLink filename={expense.receipt} />}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(expense)}
        className={baseClass + interactiveClass}
      >
        {body}
      </button>
    );
  }
  return <article className={baseClass}>{body}</article>;
}
