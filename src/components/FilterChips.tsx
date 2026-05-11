import { useTranslation, type TranslationKey } from '../i18n';

export type ExpenseTypeFilter = 'all' | 'payments' | 'bills';

export interface ExpenseFilters {
  type: ExpenseTypeFilter;
  /** Empty string = "all payers". */
  payer: string;
  /** Empty string = "all categories". */
  category: string;
}

export const initialFilters: ExpenseFilters = {
  type: 'all',
  payer: '',
  category: '',
};

interface TypeOption {
  value: ExpenseTypeFilter;
  labelKey: TranslationKey;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'all', labelKey: 'filter.all' },
  { value: 'payments', labelKey: 'filter.payments' },
  { value: 'bills', labelKey: 'filter.bills' },
];

interface FilterBarProps {
  value: ExpenseFilters;
  onChange: (next: ExpenseFilters) => void;
  /** Distinct payer values present in the project — used to populate the
   *  payer dropdown. The "All" option is added automatically. */
  payers: string[];
  /** Distinct categories present in the project. */
  categories: string[];
}

export function FilterBar({ value, onChange, payers, categories }: FilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label={t('filter.label')}
        className="inline-flex flex-wrap gap-1.5 rounded-full bg-slate-100 p-1"
      >
        {TYPE_OPTIONS.map((opt) => {
          const active = value.type === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ ...value, type: opt.value })}
              className={`inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-medium transition ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>

      <label className="inline-flex items-center gap-1.5 text-xs">
        <span className="text-slate-500">{t('filter.payerLabel')}</span>
        <select
          aria-label={t('filter.payerLabel')}
          value={value.payer}
          onChange={(e) => onChange({ ...value, payer: e.target.value })}
          className="h-8 rounded-full border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">{t('filter.allPayers')}</option>
          {payers.map((p) => (
            <option key={p || '__unknown'} value={p || '__unknown'}>
              {p || t('summary.unknownPayer')}
            </option>
          ))}
        </select>
      </label>

      <label className="inline-flex items-center gap-1.5 text-xs">
        <span className="text-slate-500">{t('filter.categoryLabel')}</span>
        <select
          aria-label={t('filter.categoryLabel')}
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
          className="h-8 rounded-full border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">{t('filter.allCategories')}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {(value.payer || value.category || value.type !== 'all') && (
        <button
          type="button"
          onClick={() => onChange(initialFilters)}
          className="inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          {t('filter.clear')}
        </button>
      )}
    </div>
  );
}

interface Filterable {
  kind?: 'expense' | 'bill';
  payer?: string;
  category?: string;
}

/** Returns whichever of the filters' axes match the expense AND together. */
export function applyFilters<T extends Filterable>(
  expenses: T[],
  filters: ExpenseFilters,
): T[] {
  return expenses.filter((e) => {
    if (filters.type === 'bills' && e.kind !== 'bill') return false;
    if (filters.type === 'payments' && e.kind === 'bill') return false;
    if (filters.payer) {
      const target =
        filters.payer === '__unknown' ? '' : filters.payer;
      if ((e.payer ?? '') !== target) return false;
    }
    if (filters.category && (e.category ?? '') !== filters.category) {
      return false;
    }
    return true;
  });
}

/** Backwards-compatible alias for callers that only care about type. */
export function applyFilter<T extends Filterable>(
  expenses: T[],
  type: ExpenseTypeFilter,
): T[] {
  return applyFilters(expenses, { ...initialFilters, type });
}
