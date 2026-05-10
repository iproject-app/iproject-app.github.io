import { useState } from 'react';
import type { Expense, ProjectData } from '../lib/types';

const STANDARD_CATEGORIES = [
  'Labor',
  'Materials',
  'Services',
  'Utilities',
  'Garbage',
  'Other',
];

const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'CAD'];

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface Props {
  data: ProjectData;
  saving: boolean;
  onAdd: (next: ProjectData) => Promise<void>;
}

interface FormState {
  date: string;
  category: string;
  payer: string;
  payee: string;
  description: string;
  amount: string;
  currency: string;
  isBill: boolean;
}

const blankForm = (): FormState => ({
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
  const [form, setForm] = useState<FormState>(blankForm);
  const [error, setError] = useState<string | null>(null);

  // Suggest categories from project's customCategories first, then standards,
  // de-duplicated and case-preserving.
  const seen = new Set<string>();
  const suggestions = [...(data.customCategories ?? []), ...STANDARD_CATEGORIES].filter(
    (c) => {
      const k = c.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    },
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    if (!form.payee.trim()) {
      setError('Payee is required.');
      return;
    }

    const expense: Expense = {
      id: newId(),
      date: form.date,
      category: form.category.trim() || 'Other',
      payer: form.payer.trim(),
      payee: form.payee.trim(),
      description: form.description.trim(),
      amount,
      currency: form.currency,
      kind: form.isBill ? 'bill' : 'expense',
    };

    try {
      await onAdd({
        ...data,
        expenses: [...data.expenses, expense],
      });
      setForm(blankForm());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(msg);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Date">
          <input
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
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
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
        {hint && <span className="ml-1 font-normal text-slate-500">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
