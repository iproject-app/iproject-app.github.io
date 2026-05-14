import { useEffect, useRef, useState } from 'react';
import type { ProjectData } from '../lib/types';
import { useTranslation, type TranslationKey } from '../i18n';
import {
  ContactsManager,
  contactToDraft,
  draftsToContacts,
  type ContactDraft,
} from './ContactsManager';
import {
  applyContractDraft,
  ContractEditor,
  projectToContractDraft,
  type ContractDraft,
} from './ContractEditor';
import { NormalizePanel } from './NormalizePanel';

interface Props {
  open: boolean;
  data: ProjectData;
  saving: boolean;
  onSave: (next: ProjectData) => Promise<void>;
  /** Persist a new project display name. Called only when the name actually
   *  changes; the parent typically wires this to the rename API. */
  onRename?: (name: string) => Promise<void>;
  /** Soft-delete this project. The parent wires this to the delete API and
   *  is responsible for navigating away once the promise resolves. */
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

type Tab = 'general' | 'contacts' | 'contract' | 'plans';

interface TabDef {
  value: Tab;
  labelKey: TranslationKey;
}

const TABS: TabDef[] = [
  { value: 'general', labelKey: 'settings.tabGeneral' },
  { value: 'contacts', labelKey: 'settings.tabContacts' },
  { value: 'contract', labelKey: 'settings.tabContract' },
  { value: 'plans', labelKey: 'settings.tabPlans' },
];

export function SettingsModal({
  open,
  data,
  saving,
  onSave,
  onRename,
  onDelete,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>('general');
  const [nameDraft, setNameDraft] = useState(data.name);
  const [contactDrafts, setContactDrafts] = useState<ContactDraft[]>([]);
  const [contractDraft, setContractDraft] = useState<ContractDraft>(() =>
    projectToContractDraft(data),
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setNameDraft(data.name);
      setContactDrafts((data.contacts ?? []).map(contactToDraft));
      setContractDraft(projectToContractDraft(data));
      setTab('general');
      setError(null);
      setConfirmingDelete(false);
      setDeleting(false);
    }
  }, [open, data]);

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
      const trimmedName = nameDraft.trim() || data.name;
      const nameChanged = trimmedName !== data.name;
      if (nameChanged && onRename) {
        await onRename(trimmedName);
      }
      const next = applyContractDraft(
        {
          ...data,
          name: trimmedName,
          contacts: draftsToContacts(contactDrafts),
        },
        contractDraft,
      );
      await onSave(next);
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
          {tab === 'general' && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">
                  {t('general.name')}
                </span>
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  disabled={saving}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </label>
              <div className="flex flex-col gap-1 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="font-medium text-slate-700">
                    {t('general.slug')}
                  </span>
                  <input
                    type="text"
                    value={data.slug}
                    readOnly
                    className="h-11 cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-600"
                  />
                </label>
                <span className="text-xs text-slate-500">
                  {t('general.slugHint')}
                </span>
              </div>
              {onDelete && (
                <section
                  aria-label={t('general.dangerZone')}
                  className="mt-2 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4"
                >
                  <h3 className="text-sm font-semibold text-rose-800">
                    {t('general.dangerZone')}
                  </h3>
                  <p className="text-xs text-rose-700/90">
                    {t('general.deleteProjectHint')}
                  </p>
                  {!confirmingDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      disabled={saving || deleting}
                      className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-rose-300 bg-white px-4 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t('general.deleteProject')}
                    </button>
                  )}
                  {confirmingDelete && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-rose-900">
                        {t('general.deleteConfirm')}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setError(null);
                            setDeleting(true);
                            try {
                              await onDelete();
                              // Parent navigates / closes; nothing else to do.
                            } catch (e: unknown) {
                              const msg =
                                e instanceof Error
                                  ? e.message
                                  : t('errors.saveFailed');
                              setError(msg);
                              setDeleting(false);
                              setConfirmingDelete(false);
                            }
                          }}
                          disabled={deleting}
                          className="inline-flex h-10 items-center justify-center rounded-md bg-rose-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deleting
                            ? t('general.deleting')
                            : t('general.deleteConfirmYes')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(false)}
                          disabled={deleting}
                          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
                        >
                          {t('edit.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
          {tab === 'contacts' && (
            <div className="flex flex-col gap-4">
              <ContactsManager
                value={contactDrafts}
                onChange={setContactDrafts}
                saving={saving}
              />
              <NormalizePanel
                data={data}
                liveContacts={draftsToContacts(contactDrafts)}
                saving={saving}
                onApply={async (next) => {
                  // The retro-normalize path saves expenses + the current
                  // contact drafts; close the modal once the round trip
                  // completes so the user sees the rewritten list.
                  await onSave(next);
                  onClose();
                }}
              />
            </div>
          )}
          {tab === 'contract' && (
            <ContractEditor
              value={contractDraft}
              onChange={setContractDraft}
              saving={saving}
            />
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
