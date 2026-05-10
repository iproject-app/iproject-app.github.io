import { useTranslation } from '../i18n';

export function BillBadge() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
      {t('badge.bill')}
    </span>
  );
}
