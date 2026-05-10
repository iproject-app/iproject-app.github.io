import type { Expense } from '../lib/types';
import { formatDate, formatMoney } from '../lib/format';
import { CategoryBadge } from './CategoryBadge';
import { BillBadge } from './BillBadge';
import { ReceiptLink } from './ReceiptLink';

interface Props {
  expense: Expense;
}

export function ExpenseRow({ expense }: Props) {
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
