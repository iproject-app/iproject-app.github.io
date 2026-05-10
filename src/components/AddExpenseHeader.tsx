import { useTranslation } from '../i18n';

interface Props {
  open: boolean;
  onToggle: () => void;
}

/** Always-visible header for the collapsible add-expense form. Tapping
 *  anywhere on it toggles the field grid below. */
export function AddExpenseHeader({ open, onToggle }: Props) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="add-expense-fields"
      aria-label={open ? t('add.collapse') : t('add.expand')}
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
        <h2 className="text-sm font-semibold text-slate-900">
          {t('add.title')}
        </h2>
        <p className="text-xs text-slate-500">{t('add.hint')}</p>
      </div>
    </button>
  );
}
