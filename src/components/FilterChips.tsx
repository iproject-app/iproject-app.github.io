import { useTranslation, type TranslationKey } from '../i18n';

export type ExpenseFilter = 'all' | 'payments' | 'bills';

interface Props {
  value: ExpenseFilter;
  onChange: (next: ExpenseFilter) => void;
}

interface Option {
  value: ExpenseFilter;
  labelKey: TranslationKey;
}

const OPTIONS: Option[] = [
  { value: 'all', labelKey: 'filter.all' },
  { value: 'payments', labelKey: 'filter.payments' },
  { value: 'bills', labelKey: 'filter.bills' },
];

export function FilterChips({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t('filter.label')}
      className="inline-flex flex-wrap gap-1.5 rounded-full bg-slate-100 p-1"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
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
  );
}

export function applyFilter<T extends { kind?: 'expense' | 'bill' }>(
  expenses: T[],
  filter: ExpenseFilter,
): T[] {
  if (filter === 'all') return expenses;
  if (filter === 'bills') return expenses.filter((e) => e.kind === 'bill');
  // 'payments' — anything that isn't a bill (kind unset means expense).
  return expenses.filter((e) => e.kind !== 'bill');
}
