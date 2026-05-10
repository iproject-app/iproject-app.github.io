import { useRef, useState } from 'react';
import type { ProjectData } from '../lib/types';
import { todayISO } from '../lib/format';
import { categorySuggestions, SUPPORTED_CURRENCIES } from '../lib/categories';
import {
  newExpenseId,
  validateExpense,
  type ExpenseFormInput,
} from '../lib/validation';

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

export function AddExpenseForm({ data, saving, onAdd }: Props) {
  const [form, setForm] = useState<ExpenseFormInput>(blankForm);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

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
      setError(result.error);
      return;
    }

    try {
      await onAdd({
        ...data,
        expenses: [...data.expenses, { id: newExpenseId(), ...result.expense }],
      });
      setForm(blankForm());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(msg);
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

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4 shadow-sm ring-1 ring-sky-100/60 sm:p-6"
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="add-expense-fields"
        aria-label={open ? 'Collapse add expense form' : 'Expand add expense form'}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Add expense</h2>
          <p className="text-xs text-slate-500">
            Record a payment or quote — leave the payer blank to mark it as a bill.
          </p>
        </div>
      </button>

      {open && (
        <div id="add-expense-fields">
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date">
              <input
                ref={firstFieldRef}
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Category">
              <input
                type="text"
                list="category-suggestions"
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className={inputClass}
                required
              />
              <datalist id="category-suggestions">
                {suggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>

            <Field label="Payer" hint="Leave blank for a bill / quote.">
              <input
                type="text"
                value={form.payer}
                onChange={(e) => update('payer', e.target.value)}
                className={inputClass}
                placeholder="—"
              />
            </Field>

            <Field label="Payee">
              <input
                type="text"
                value={form.payee}
                onChange={(e) => update('payee', e.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Description" className="sm:col-span-2">
              <input
                type="text"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Amount">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Currency">
              <select
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                className={inputClass}
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
                onChange={(e) => update('isBill', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Mark as bill (orçamento) — money owed, not yet paid.
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            >
              {error}
            </p>
          )}

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="reset"
              onClick={() => {
                setForm(blankForm());
                setError(null);
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
              disabled={saving}
            >
              Clear
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Add expense'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

const inputClass =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className ?? ''}`}>
      <span className="font-medium text-slate-700">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-slate-500">· {hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}
