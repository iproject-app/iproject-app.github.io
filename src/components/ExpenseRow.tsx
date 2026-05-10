import type { Expense } from '../lib/types';
import { formatDate, formatMoney } from '../lib/format';
import { CategoryBadge } from './CategoryBadge';
import { BillBadge } from './BillBadge';
import { ReceiptLink } from './ReceiptLink';

interface Props {
  expense: Expense;
  onClick?: (expense: Expense) => void;
}

export function ExpenseRow({ expense, onClick }: Props) {
  const isBill = expense.kind === 'bill';
  const interactive = Boolean(onClick);
  const handleKey = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(expense);
    }
  };
  return (
    <tr
      onClick={onClick ? () => onClick(expense) : undefined}
      onKeyDown={interactive ? handleKey : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`${isBill ? 'bg-amber-50/60' : ''} ${interactive ? 'cursor-pointer hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500' : ''}`}
    >
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
