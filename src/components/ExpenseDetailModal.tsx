import { useEffect, useRef, useState } from 'react';
import type { Expense, ProjectData } from '../lib/types';
import { categorySuggestions } from '../lib/categories';
import { formatDate, formatMoney } from '../lib/format';
import { findBillById, openBills } from '../lib/bills';
import {
  validateExpense,
  type ExpenseFormInput,
} from '../lib/validation';
import { useTranslation, type TranslationKey } from '../i18n';
import { AddExpenseFields } from './AddExpenseFields';
import { BillBadge } from './BillBadge';
import { BillPicker } from './BillPicker';
import { CategoryBadge } from './CategoryBadge';
import { ReceiptLink } from './ReceiptLink';
import { ReceiptViewer } from './ReceiptViewer';

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

interface ReceiptExtras {
  receipt?: string;
  fxRate?: number;
  fxRateDate?: string;
  fxRateSource?: string;
  linkedTo?: string;
}

const expenseToExtras = (e: Expense): ReceiptExtras => ({
  receipt: e.receipt,
  fxRate: e.fxRate,
  fxRateDate: e.fxRateDate,
  fxRateSource: e.fxRateSource,
  linkedTo: e.linkedTo,
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
  const [extras, setExtras] = useState<ReceiptExtras>({});
  const [error, setError] = useState<FormError | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Reset state every time the dialog opens with a new expense.
  useEffect(() => {
    if (expense) {
      setForm(expenseToForm(expense));
      setExtras(expenseToExtras(expense));
      setMode('view');
      setError(null);
      setConfirmingDelete(false);
    } else {
      setForm(null);
      setExtras({});
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

    const updated: Expense = {
      id: expense.id,
      ...result.expense,
      ...(extras.receipt ? { receipt: extras.receipt } : {}),
      ...(extras.fxRate != null ? { fxRate: extras.fxRate } : {}),
      ...(extras.fxRateDate ? { fxRateDate: extras.fxRateDate } : {}),
      ...(extras.fxRateSource ? { fxRateSource: extras.fxRateSource } : {}),
      // Bills can't link to other bills (server enforces this too).
      ...(!result.expense.kind || result.expense.kind === 'bill'
        ? {}
        : extras.linkedTo
          ? { linkedTo: extras.linkedTo }
          : {}),
    };
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
    setExtras(expenseToExtras(expense));
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
            <DetailBody expense={expense} allExpenses={data.expenses} />
            {expense.receipt && (
              <ReceiptViewer filename={expense.receipt} slug={data.slug} />
            )}
            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {errorMessage}
              </p>
            )}
            {confirmingDelete ? (
              <div
                role="alertdialog"
                aria-labelledby="confirm-delete-title"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
              >
                <p id="confirm-delete-title" className="font-semibold">
                  {t('detail.confirmDeleteTitle')}
                </p>
                <p className="mt-1 text-rose-800/90">
                  {t('detail.confirmDeleteBody')}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t('edit.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-rose-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? t('edit.deleting') : t('detail.confirmDeleteYes')}
                  </button>
                </div>
              </div>
            ) : (
              <footer className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-rose-300 bg-white px-4 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('edit.delete')}
                </button>
              </footer>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="contents">
            <AddExpenseFields
              form={form}
              suggestions={categorySuggestions(data.customCategories)}
              onChange={update}
            />
            {!form.isBill && (
              <BillPicker
                bills={openBills(data.expenses).filter(
                  (b) => b.id !== expense.id,
                )}
                allExpenses={data.expenses}
                value={extras.linkedTo}
                onChange={(linkedTo) =>
                  setExtras((e) => ({ ...e, linkedTo }))
                }
              />
            )}
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

function DetailBody({
  expense,
  allExpenses,
}: {
  expense: Expense;
  allExpenses: Expense[];
}) {
  const { t } = useTranslation();
  const isBill = expense.kind === 'bill';
  const linkedBill = findBillById(expense.linkedTo, allExpenses);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{formatDate(expense.date)}</p>
          <p className="mt-0.5 truncate text-base font-semibold text-slate-900 sm:text-lg">
            {expense.payee}
          </p>
          {expense.payer && (
            <p className="truncate text-xs text-slate-500">
              from {expense.payer}
            </p>
          )}
        </div>
        <p className="whitespace-nowrap text-right text-lg font-semibold text-slate-900 sm:text-xl">
          {formatMoney(expense.amount, expense.currency)}
        </p>
      </div>

      {expense.description && (
        <p className="text-sm text-slate-700">{expense.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <CategoryBadge category={expense.category} />
        {isBill && <BillBadge />}
        {expense.receipt && <ReceiptLink filename={expense.receipt} />}
      </div>

      {linkedBill && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
          <span className="font-medium">{t('billing.linkedToBill')}:</span>{' '}
          {linkedBill.payee} · {formatDate(linkedBill.date)} ·{' '}
          {formatMoney(linkedBill.amount, linkedBill.currency)}
        </p>
      )}
    </div>
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
  'w-full max-w-xl rounded-2xl border-0 bg-white p-0 shadow-xl outline-none backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm m-auto';
