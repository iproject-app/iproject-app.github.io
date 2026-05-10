import { useEffect, useRef, useState } from 'react';
import type { Expense, ProjectData } from '../lib/types';
import { categorySuggestions } from '../lib/categories';
import { formatDate, formatMoney } from '../lib/format';
import {
  validateExpense,
  type ExpenseFormInput,
} from '../lib/validation';
import { useTranslation, type TranslationKey } from '../i18n';
import { AddExpenseFields } from './AddExpenseFields';
import { BillBadge } from './BillBadge';
import { CategoryBadge } from './CategoryBadge';
import { ReceiptLink } from './ReceiptLink';

interface Props {
  /** The expense being viewed/edited; null means closed. */
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

type Mode = 'view' | 'edit';

export function ExpenseDetailModal({
  expense,
  data,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [form, setForm] = useState<ExpenseFormInput | null>(null);
  const [error, setError] = useState<FormError | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Reset state every time the dialog opens with a new expense.
  useEffect(() => {
    if (expense) {
      setForm(expenseToForm(expense));
      setMode('view');
      setError(null);
      setConfirmingDelete(false);
    } else {
      setForm(null);
    }
  }, [expense]);

  // Imperatively open/close the native <dialog>.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (expense && !dialog.open) dialog.showModal();
    if (!expense && dialog.open) dialog.close();
  }, [expense]);

  if (!expense || !form) {
    return <dialog ref={dialogRef} className={dialogClass} onClose={onClose} />;
  }

  const update = <K extends keyof ExpenseFormInput>(
    key: K,
    value: ExpenseFormInput[K],
  ) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
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

  const enterEdit = () => {
    setMode('edit');
    setError(null);
    setConfirmingDelete(false);
  };

  const cancelEdit = () => {
    // Discard local edits and return to view mode with the expense's stored
    // values; the modal stays open so the user can still see the details.
    setForm(expenseToForm(expense));
    setMode('view');
    setError(null);
  };

  const errorMessage =
    error == null
      ? null
      : error.kind === 'i18n'
        ? t(error.key)
        : error.message;

  return (
    <dialog ref={dialogRef} className={dialogClass} onClose={onClose}>
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === 'edit' ? t('edit.title') : t('detail.title')}
          </h2>
          <div className="flex items-center gap-1">
            {mode === 'view' && (
              <button
                type="button"
                onClick={enterEdit}
                aria-label={t('detail.edit')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <PencilIcon />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('edit.close')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        {mode === 'view' ? (
          <>
            <DetailBody expense={expense} />
            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {errorMessage}
              </p>
            )}
            <footer className="flex items-center justify-between gap-2">
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
            </footer>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="contents">
            <AddExpenseFields
              form={form}
              suggestions={categorySuggestions(data.customCategories)}
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
            <footer className="flex items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={cancelEdit}
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
                {saving ? t('add.saving') : t('edit.save')}
              </button>
            </footer>
          </form>
        )}
      </div>
    </dialog>
  );
}

function DetailBody({ expense }: { expense: Expense }) {
  const { t } = useTranslation();
  const isBill = expense.kind === 'bill';
  const dash = t('detail.dash');
  return (
    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-6 sm:gap-y-3">
      <DetailRow label={t('table.date')} value={formatDate(expense.date)} />
      <DetailRow
        label={t('table.category')}
        value={
          <span className="inline-flex items-center gap-1.5">
            <CategoryBadge category={expense.category} />
            {isBill && <BillBadge />}
          </span>
        }
      />
      <DetailRow label={t('detail.payer')} value={expense.payer || dash} />
      <DetailRow label={t('detail.payee')} value={expense.payee} />
      {expense.description && (
        <DetailRow
          label={t('table.description')}
          value={expense.description}
        />
      )}
      <DetailRow
        label={t('table.amount')}
        value={
          <span className="font-semibold text-slate-900">
            {formatMoney(expense.amount, expense.currency)}
          </span>
        }
      />
      {expense.receipt && (
        <DetailRow
          label={t('receiptLink.label')}
          value={<ReceiptLink filename={expense.receipt} />}
        />
      )}
    </dl>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wide text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal">
        {label}
      </dt>
      <dd className="text-slate-900">{value}</dd>
    </>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path
        d="M14.5 3.5l2 2L6 16H4v-2l10.5-10.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
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
  );
}

const dialogClass =
  'w-full max-w-xl rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm m-auto';
