import { useState } from 'react';
import type { Contact, ProjectData } from '../lib/types';
import {
  countNameChanges,
  normalizeExpenses,
} from '../lib/contacts';
import { useTranslation } from '../i18n';

interface Props {
  data: ProjectData;
  /** Working draft of contacts from the Contacts tab — the user hasn't saved
   *  them yet, so we use the in-flight list (not `data.contacts`) when
   *  computing what would change. */
  liveContacts: Contact[];
  saving: boolean;
  onApply: (next: ProjectData) => Promise<void>;
}

/** Settings → Contacts → "Normalize existing entries" panel. Computes how
 *  many expenses' payer/payee would be rewritten by the current alias rules,
 *  prompts for confirmation, and dispatches the save with the rewritten
 *  expenses list. */
export function NormalizePanel({ data, liveContacts, saving, onApply }: Props) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = countNameChanges(data.expenses, liveContacts);

  const handleApply = async () => {
    if (count === 0) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    try {
      await onApply({
        ...data,
        contacts: liveContacts,
        expenses: normalizeExpenses(data.expenses, liveContacts),
      });
      setConfirming(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('errors.saveFailed');
      setError(msg);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-600">{t('contacts.normalizeHint')}</p>

      {count === 0 ? (
        <p className="mt-3 text-sm text-slate-700">
          {t('contacts.normalizeAllUp')}
        </p>
      ) : confirming ? (
        <div
          role="alertdialog"
          aria-labelledby="normalize-confirm-title"
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p id="normalize-confirm-title" className="font-medium">
            {t('contacts.normalizeConfirm', { count })}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              {t('edit.cancel')}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-md bg-amber-600 px-3 text-xs font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t('contacts.normalizing') : t('contacts.normalizeYes')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleApply}
          disabled={saving}
          className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-medium text-amber-800 hover:bg-amber-50"
        >
          {count === 1
            ? t('contacts.normalizeButtonOne')
            : t('contacts.normalizeButtonMany', { count })}
        </button>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </p>
      )}
    </section>
  );
}
