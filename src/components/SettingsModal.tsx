import { useEffect, useRef, useState } from 'react';
import type { ProjectData } from '../lib/types';
import { useTranslation, type TranslationKey } from '../i18n';
import {
  ContactsManager,
  contactToDraft,
  draftsToContacts,
  type ContactDraft,
} from './ContactsManager';

interface Props {
  open: boolean;
  data: ProjectData;
  saving: boolean;
  onSave: (next: ProjectData) => Promise<void>;
  onClose: () => void;
}

type Tab = 'contacts' | 'contracts' | 'plans';

interface TabDef {
  value: Tab;
  labelKey: TranslationKey;
}

const TABS: TabDef[] = [
  { value: 'contacts', labelKey: 'settings.tabContacts' },
  { value: 'contracts', labelKey: 'settings.tabContracts' },
  { value: 'plans', labelKey: 'settings.tabPlans' },
];

export function SettingsModal({
  open,
  data,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>('contacts');
  const [contactDrafts, setContactDrafts] = useState<ContactDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setContactDrafts((data.contacts ?? []).map(contactToDraft));
      setTab('contacts');
      setError(null);
    }
  }, [open, data.contacts]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await onSave({
        ...data,
        contacts: draftsToContacts(contactDrafts),
      });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('errors.saveFailed');
      setError(msg);
    }
  };

  return (
    <dialog ref={dialogRef} className={dialogClass} onClose={onClose}>
      <form
        method="dialog"
        onSubmit={handleSave}
        noValidate
        className="flex flex-col gap-4 p-5 sm:p-6"
      >
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('settings.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('edit.close')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <CloseIcon />
          </button>
        </header>

        <div
          role="tablist"
          aria-label={t('settings.title')}
          className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1"
        >
          {TABS.map((tabDef) => {
            const active = tab === tabDef.value;
            return (
              <button
                key={tabDef.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(tabDef.value)}
                className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 text-xs font-medium transition ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(tabDef.labelKey)}
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          {tab === 'contacts' && (
            <ContactsManager
              value={contactDrafts}
              onChange={setContactDrafts}
              saving={saving}
            />
          )}
          {tab === 'contracts' && (
            <Placeholder text={t('settings.placeholderContracts')} />
          )}
          {tab === 'plans' && (
            <Placeholder text={t('settings.placeholderPlans')} />
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {error}
          </p>
        )}

        <footer className="flex items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
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
    </dialog>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
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
  'w-full max-w-2xl rounded-2xl border-0 bg-white p-0 shadow-xl outline-none backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm m-auto';
