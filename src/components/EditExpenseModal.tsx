import { useEffect, useRef, useState } from 'react';
import type { Expense, ProjectData } from '../lib/types';
import { categorySuggestions } from '../lib/categories';
import {
  validateExpense,
  type ExpenseFormInput,
} from '../lib/validation';
import { useTranslation, type TranslationKey } from '../i18n';
import { AddExpenseFields } from './AddExpenseFields';

interface Props {
  /** The expense being edited; null means closed. */
  expense: Expense | null;
  data: ProjectData;
  saving: boolean;
  onSave: (next: ProjectData) => Promise<void>;
  onClose: () => void;
}

const expenseToForm = (e: Expense): ExpenseFormInput => ({
  date: e.date,
  category: e.category,
  payer: e.payer,
  payee: e.payee,
  description: e.description,
  amount: String(e.amount),
  currency: e.currency ?? 'BRL',
  isBill: e.kind === 'bill',
});

type FormError =
  | { kind: 'i18n'; key: TranslationKey }
  | { kind: 'raw'; message: string };

export function EditExpenseModal({
  expense,
  data,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<ExpenseFormInput | null>(null);
  const [error, setError] = useState<FormError | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Sync local form state with the expense when it changes / opens.
  useEffect(() => {
    if (expense) {
      setForm(expenseToForm(expense));
      setError(null);
      setConfirmingDelete(false);
    } else {
      setForm(null);
    }
  }, [expense]);

  // Open/close the native <dialog> imperatively as required by the API.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (expense && !dialog.open) dialog.showModal();
    if (!expense && dialog.open) dialog.close();
  }, [expense]);

  if (!form) {
    // Render the dialog element so the ref is stable, but with no body.
    return <dialog ref={dialogRef} className={dialogClass} onClose={onClose} />;
  }

  const update = <K extends keyof ExpenseFormInput>(
    key: K,
    value: ExpenseFormInput[K],
  ) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!expense || !form) return;
    setError(null);

    const result = validateExpense(form);
    if (!result.ok) {
      setError({ kind: 'i18n', key: result.errorKey });
      return;
    }

    const updated: Expense = { id: expense.id, ...result.expense };
    const next: ProjectData = {
      ...data,
      expenses: data.expenses.map((e) => (e.id === expense.id ? updated : e)),
    };
    try {
      await onSave(next);
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('errors.saveFailed');
      setError({ kind: 'raw', message });
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setError(null);
    const next: ProjectData = {
      ...data,
      expenses: data.expenses.filter((e) => e.id !== expense.id),
    };
    try {
      await onSave(next);
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('errors.saveFailed');
      setError({ kind: 'raw', message });
      setConfirmingDelete(false);
    }
  };

  const errorMessage =
    error == null
      ? null
      : error.kind === 'i18n'
        ? t(error.key)
        : error.message;

  const suggestions = categorySuggestions(data.customCategories);

  return (
    <dialog ref={dialogRef} className={dialogClass} onClose={onClose}>
      <form
        method="dialog"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('edit.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('edit.close')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <AddExpenseFields
          form={form}
          suggestions={suggestions}
          onChange={update}
        />

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {errorMessage}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className={`inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              confirmingDelete
                ? 'border-rose-300 bg-rose-600 text-white hover:bg-rose-700'
                : 'border-rose-300 bg-white text-rose-700 hover:bg-rose-50'
            }`}
          >
            {saving && confirmingDelete
              ? t('edit.deleting')
              : confirmingDelete
                ? t('edit.confirmDelete')
                : t('edit.delete')}
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('edit.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && !confirmingDelete ? t('add.saving') : t('edit.save')}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

// Native <dialog> resets margins via `m-auto` for centering. Backdrop styled
// via the `backdrop:` Tailwind variant. Mobile: full-bleed sheet via min-w/h.
const dialogClass =
  'w-full max-w-xl rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm m-auto';
