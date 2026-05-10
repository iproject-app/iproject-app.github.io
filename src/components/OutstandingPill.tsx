import { formatMoney } from '../lib/format';
import { useTranslation } from '../i18n';

interface Props {
  amount: number;
}

/** Amber pill showing the total still owed across open bills. Renders nothing
 *  when the amount is zero or negative — there's no point taking up space. */
export function OutstandingPill({ amount }: Props) {
  const { t } = useTranslation();
  if (amount <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
      <span className="uppercase tracking-wide">{t('billing.outstanding')}</span>
      <span className="font-semibold">{formatMoney(amount)}</span>
    </span>
  );
}
