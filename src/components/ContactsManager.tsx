import type { Contact } from '../lib/types';
import { useTranslation } from '../i18n';

export interface ContactDraft {
  id: string;
  name: string;
  role: string;
  /** Raw comma-separated input — parsed on save by `draftsToContacts`. */
  aliases: string;
}

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const contactToDraft = (c: Contact): ContactDraft => ({
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

const draftToContact = (d: ContactDraft): Contact => {
  const c: Contact = { id: d.id, name: d.name.trim() };
  const role = d.role.trim();
  if (role) c.role = role;
  const aliases = parseAliases(d.aliases);
  if (aliases.length) c.aliases = aliases;
  return c;
};

/** Convert the manager's working drafts into the canonical contact list,
 *  dropping any draft whose name is left blank. */
export function draftsToContacts(drafts: ContactDraft[]): Contact[] {
  return drafts
    .map(draftToContact)
    .filter((c) => c.name !== '');
}

interface Props {
  value: ContactDraft[];
  onChange: (next: ContactDraft[]) => void;
  saving?: boolean;
}

/** Pure (non-dialog) UI for editing a project's contact list. State lives in
 *  the caller so the same component can sit inside a modal tab or a future
 *  full-page settings view without changing shape. */
export function ContactsManager({ value, onChange, saving }: Props) {
  const { t } = useTranslation();

  const update = (id: string, patch: Partial<ContactDraft>) =>
    onChange(value.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const remove = (id: string) =>
    onChange(value.filter((d) => d.id !== id));

  const add = () =>
    onChange([
      ...value,
      { id: newId(), name: '', role: '', aliases: '' },
    ]);

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
          {t('contacts.empty')}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {value.map((d) => (
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
                  onChange={(e) => update(d.id, { name: e.target.value })}
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
                  onChange={(e) => update(d.id, { role: e.target.value })}
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
                  onChange={(e) => update(d.id, { aliases: e.target.value })}
                  className={inputClass}
                  placeholder="alias1, alias2, alias3"
                />
              </label>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => remove(d.id)}
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
        onClick={add}
        disabled={saving}
        className="inline-flex h-11 items-center justify-center self-start rounded-lg border border-dashed border-sky-300 bg-sky-50 px-4 text-sm font-medium text-sky-800 hover:bg-sky-100"
      >
        + {t('contacts.add')}
      </button>
    </div>
  );
}

const inputClass =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
