import type { Ref } from 'react';
import { SUPPORTED_CURRENCIES } from '../lib/categories';
import type { ExpenseFormInput } from '../lib/validation';
import { useTranslation } from '../i18n';
import { Field, fieldInputClass } from './Field';

interface Props {
  form: ExpenseFormInput;
  suggestions: readonly string[];
  firstFieldRef?: Ref<HTMLInputElement>;
  onChange: <K extends keyof ExpenseFormInput>(
    key: K,
    value: ExpenseFormInput[K],
  ) => void;
}

/** Pure presentational input grid for the add-expense form. Form state and
 *  submit logic live one level up in AddExpenseForm. */
export function AddExpenseFields({
  form,
  suggestions,
  firstFieldRef,
  onChange,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label={t('fields.date')}>
        <input
          ref={firstFieldRef}
          type="date"
          value={form.date}
          onChange={(e) => onChange('date', e.target.value)}
          className={fieldInputClass}
          required
        />
      </Field>

      <Field label={t('fields.category')}>
        <input
          type="text"
          list="category-suggestions"
          value={form.category}
          onChange={(e) => onChange('category', e.target.value)}
          className={fieldInputClass}
          required
        />
        <datalist id="category-suggestions">
          {suggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <Field label={t('fields.payer')} hint={t('fields.payerHint')}>
        <input
          type="text"
          value={form.payer}
          onChange={(e) => onChange('payer', e.target.value)}
          className={fieldInputClass}
          placeholder="—"
        />
      </Field>

      <Field label={t('fields.payee')}>
        <input
          type="text"
          value={form.payee}
          onChange={(e) => onChange('payee', e.target.value)}
          className={fieldInputClass}
          required
        />
      </Field>

      <Field label={t('fields.description')} className="sm:col-span-2">
        <input
          type="text"
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          className={fieldInputClass}
        />
      </Field>

      <Field label={t('fields.amount')}>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(e) => onChange('amount', e.target.value)}
          className={fieldInputClass}
          required
        />
      </Field>

      <Field label={t('fields.currency')}>
        <select
          value={form.currency}
          onChange={(e) => onChange('currency', e.target.value)}
          className={fieldInputClass}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
        <input
          type="checkbox"
          checked={form.isBill}
          onChange={(e) => onChange('isBill', e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        {t('fields.markAsBill')}
      </label>
    </div>
  );
}
