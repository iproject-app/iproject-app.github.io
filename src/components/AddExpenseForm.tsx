import { useRef, useState } from 'react';
import type { ProjectData } from '../lib/types';
import { todayISO } from '../lib/format';
import { categorySuggestions } from '../lib/categories';
import {
  newExpenseId,
  validateExpense,
  type ExpenseFormInput,
} from '../lib/validation';
import { useTranslation, type TranslationKey } from '../i18n';
import { AddExpenseHeader } from './AddExpenseHeader';
import { AddExpenseFields } from './AddExpenseFields';

interface Props {
  data: ProjectData;
  saving: boolean;
  onAdd: (next: ProjectData) => Promise<void>;
}

const blankForm = (): ExpenseFormInput => ({
  date: todayISO(),
  category: 'Materials',
  payer: '',
  payee: '',
  description: '',
  amount: '',
  currency: 'BRL',
  isBill: false,
});

type FormError =
  | { kind: 'i18n'; key: TranslationKey }
  | { kind: 'raw'; message: string };

/** Orchestrates the add-expense flow: form state, toggle, validation, save.
 *  Header and field grid are presentational and live in their own files. */
export function AddExpenseForm({ data, saving, onAdd }: Props) {
  const [form, setForm] = useState<ExpenseFormInput>(blankForm);
  const [error, setError] = useState<FormError | null>(null);
  const [open, setOpen] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const suggestions = categorySuggestions(data.customCategories);

  const update = <K extends keyof ExpenseFormInput>(
    key: K,
    value: ExpenseFormInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const result = validateExpense(form);
    if (!result.ok) {
      setError({ kind: 'i18n', key: result.errorKey });
      return;
    }

    try {
      await onAdd({
        ...data,
        expenses: [...data.expenses, { id: newExpenseId(), ...result.expense }],
      });
      setForm(blankForm());
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('errors.saveFailed');
      setError({ kind: 'raw', message });
    }
  };

  const toggle = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) {
        requestAnimationFrame(() => firstFieldRef.current?.focus());
      } else {
        setError(null);
      }
      return next;
    });
  };

  const clear = () => {
    setForm(blankForm());
    setError(null);
  };

  const errorMessage =
    error == null
      ? null
      : error.kind === 'i18n'
        ? t(error.key)
        : error.message;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4 shadow-sm ring-1 ring-sky-100/60 sm:p-6"
    >
      <AddExpenseHeader open={open} onToggle={toggle} />

      {open && (
        <div id="add-expense-fields">
          <AddExpenseFields
            form={form}
            suggestions={suggestions}
            firstFieldRef={firstFieldRef}
            onChange={update}
          />

          {errorMessage && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="reset"
              onClick={clear}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              {t('add.clear')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t('add.saving') : t('add.submit')}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
