import { useRef, useState } from 'react';
import type { Expense, ProjectData } from '../lib/types';
import { todayISO } from '../lib/format';
import { categorySuggestions } from '../lib/categories';
import {
  newExpenseId,
  validateExpense,
  type ExpenseFormInput,
} from '../lib/validation';
import {
  isDuplicateResponse,
  useProcessReceipt,
  type ExtractedExpenseFields,
} from '../lib/processReceipt';
import { useTranslation, type TranslationKey } from '../i18n';
import { openBills } from '../lib/bills';
import { AddExpenseHeader } from './AddExpenseHeader';
import { AddExpenseFields } from './AddExpenseFields';
import { BillPicker } from './BillPicker';
import { ReceiptDropZone, type ReceiptState } from './ReceiptDropZone';

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

/** AI-only metadata that round-trips on the expense but isn't user-edited. */
interface ReceiptExtras {
  receipt?: string;
  fxRate?: number;
  fxRateDate?: string;
  fxRateSource?: string;
  linkedTo?: string;
}

type FormError =
  | { kind: 'i18n'; key: TranslationKey }
  | { kind: 'raw'; message: string };

export function AddExpenseForm({ data, saving, onAdd }: Props) {
  const [form, setForm] = useState<ExpenseFormInput>(blankForm);
  const [extras, setExtras] = useState<ReceiptExtras>({});
  const [receiptState, setReceiptState] = useState<ReceiptState>({
    kind: 'idle',
  });
  const [error, setError] = useState<FormError | null>(null);
  const [open, setOpen] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const processReceipt = useProcessReceipt();

  const suggestions = categorySuggestions(data.customCategories);

  const update = <K extends keyof ExpenseFormInput>(
    key: K,
    value: ExpenseFormInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const applyExtractedFields = (fields: ExtractedExpenseFields) => {
    setForm((prev) => ({
      ...prev,
      date: fields.date ?? prev.date,
      category: fields.category ?? prev.category,
      payer: fields.payer ?? prev.payer,
      payee: fields.payee ?? prev.payee,
      description: fields.description ?? prev.description,
      amount: fields.amount != null ? String(fields.amount) : prev.amount,
      currency: fields.currency ?? prev.currency,
      isBill: fields.kind === 'bill' ? true : prev.isBill,
    }));
  };

  const handleReceiptFile = async (file: File) => {
    setError(null);
    setReceiptState({ kind: 'processing', filename: file.name });
    try {
      const res = await processReceipt(data.slug, file);
      if (isDuplicateResponse(res)) {
        // The backend recognized the file from a prior upload. Attach the
        // existing canonical filename without overwriting form values the
        // user may already have typed.
        setExtras((e) => ({ ...e, receipt: res.duplicate.filename }));
        setReceiptState({
          kind: 'attached',
          filename: res.duplicate.filename,
          duplicate: true,
        });
        return;
      }
      applyExtractedFields(res.fields);
      setExtras({
        receipt: res.filename,
        fxRate: res.fields.fxRate,
        fxRateDate: res.fields.fxRateDate,
        fxRateSource: res.fields.fxRateSource,
        linkedTo: res.fields.linkedTo ?? undefined,
      });
      setReceiptState({ kind: 'attached', filename: res.filename });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setReceiptState({ kind: 'error', message: msg });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const result = validateExpense(form);
    if (!result.ok) {
      setError({ kind: 'i18n', key: result.errorKey });
      return;
    }

    const expense: Expense = {
      id: newExpenseId(),
      ...result.expense,
      ...(extras.receipt ? { receipt: extras.receipt } : {}),
      ...(extras.fxRate != null ? { fxRate: extras.fxRate } : {}),
      ...(extras.fxRateDate ? { fxRateDate: extras.fxRateDate } : {}),
      ...(extras.fxRateSource ? { fxRateSource: extras.fxRateSource } : {}),
      ...(extras.linkedTo ? { linkedTo: extras.linkedTo } : {}),
    };

    try {
      await onAdd({ ...data, expenses: [...data.expenses, expense] });
      setForm(blankForm());
      setExtras({});
      setReceiptState({ kind: 'idle' });
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
    setExtras({});
    setReceiptState({ kind: 'idle' });
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
        <div id="add-expense-fields" className="mt-4 flex flex-col gap-3">
          <ReceiptDropZone
            state={receiptState}
            onFile={handleReceiptFile}
            disabled={saving}
          />

          <AddExpenseFields
            form={form}
            suggestions={suggestions}
            firstFieldRef={firstFieldRef}
            onChange={update}
          />

          {!form.isBill && (
            <BillPicker
              bills={openBills(data.expenses)}
              allExpenses={data.expenses}
              value={extras.linkedTo}
              onChange={(linkedTo) =>
                setExtras((prev) => ({ ...prev, linkedTo }))
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

          <div className="flex items-center justify-end gap-3">
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
