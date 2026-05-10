import { useEffect, useRef, useState } from 'react';
import type { Contact, ProjectData } from '../lib/types';
import { useTranslation } from '../i18n';

interface Props {
  open: boolean;
  data: ProjectData;
  saving: boolean;
  onSave: (next: ProjectData) => Promise<void>;
  onClose: () => void;
}

interface Draft {
  id: string;
  name: string;
  role: string;
  aliases: string; // raw comma-separated text for the input
}

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const contactToDraft = (c: Contact): Draft => ({
  id: c.id,
  name: c.name,
  role: c.role ?? '',
  aliases: (c.aliases ?? []).join(', '),
});

const parseAliases = (raw: string): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(',')) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
};

const draftToContact = (d: Draft): Contact => {
  const c: Contact = { id: d.id, name: d.name.trim() };
  const role = d.role.trim();
  if (role) c.role = role;
  const aliases = parseAliases(d.aliases);
  if (aliases.length) c.aliases = aliases;
  return c;
};

export function ContactsModal({
  open,
  data,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sync drafts every time the dialog opens.
  useEffect(() => {
    if (open) {
      setDrafts((data.contacts ?? []).map(contactToDraft));
      setError(null);
    }
  }, [open, data.contacts]);

  // Imperatively open/close the native dialog.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const removeDraft = (id: string) =>
    setDrafts((list) => list.filter((d) => d.id !== id));

  const addDraft = () =>
    setDrafts((list) => [
      ...list,
      { id: newId(), name: '', role: '', aliases: '' },
    ]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Skip contacts whose name is blank; they're either new-empty rows the
    // user didn't fill in or accidental empties from deleting all text.
    const contacts = drafts
      .map(draftToContact)
      .filter((c) => c.name !== '');

    try {
      await onSave({ ...data, contacts });
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
            {t('contacts.title')}
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

        {drafts.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            {t('contacts.empty')}
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {drafts.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">
                    {t('contacts.name')}
                  </span>
                  <input
                    type="text"
                    value={d.name}
                    onChange={(e) => updateDraft(d.id, { name: e.target.value })}
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">
                    {t('contacts.role')}
                  </span>
                  <input
                    type="text"
                    value={d.role}
                    onChange={(e) => updateDraft(d.id, { role: e.target.value })}
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">
                    {t('contacts.aliases')}
                    <span className="ml-1 font-normal text-slate-500">
                      · {t('contacts.aliasesHint')}
                    </span>
                  </span>
                  <input
                    type="text"
                    value={d.aliases}
                    onChange={(e) =>
                      updateDraft(d.id, { aliases: e.target.value })
                    }
                    className={inputClass}
                    placeholder="alias1, alias2, alias3"
                  />
                </label>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeDraft(d.id)}
                  disabled={saving}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-rose-300 bg-white px-3 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  {t('contacts.deleteContact')}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addDraft}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center self-start rounded-lg border border-dashed border-sky-300 bg-sky-50 px-4 text-sm font-medium text-sky-800 hover:bg-sky-100"
        >
          + {t('contacts.add')}
        </button>

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

const inputClass =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

const dialogClass =
  'w-full max-w-2xl rounded-2xl border-0 bg-white p-0 shadow-xl outline-none backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm m-auto';
