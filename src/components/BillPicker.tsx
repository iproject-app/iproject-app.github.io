import type { Expense } from '../lib/types';
import { remainingOnBill } from '../lib/bills';
import { formatDate, formatMoney } from '../lib/format';
import { useTranslation } from '../i18n';
import { Field, fieldInputClass } from './Field';

interface Props {
  /** Open bills available to link to. */
  bills: Expense[];
  /** All expenses — needed to compute each bill's remaining balance. */
  allExpenses: Expense[];
  /** Currently selected bill id, or undefined for none. */
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}

export function BillPicker({ bills, allExpenses, value, onChange }: Props) {
  const { t } = useTranslation();

  if (bills.length === 0) {
    // Render a disabled informational field rather than hiding entirely so the
    // user knows linkage is a thing once a bill exists.
    return (
      <Field label={t('billing.linkToBill')} className="sm:col-span-2">
        <p className="text-xs text-slate-500">{t('billing.noBillsToLink')}</p>
      </Field>
    );
  }

  return (
    <Field label={t('billing.linkToBill')} className="sm:col-span-2">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? e.target.value : undefined)}
        className={fieldInputClass}
      >
        <option value="">{t('billing.noLinkedBill')}</option>
        {bills.map((bill) => {
          const remaining = remainingOnBill(bill, allExpenses);
          return (
            <option key={bill.id} value={bill.id}>
              {bill.payee} · {formatDate(bill.date)} · {formatMoney(remaining)}
            </option>
          );
        })}
      </select>
    </Field>
  );
}
