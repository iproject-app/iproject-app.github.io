import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n';
import { useCreateProject, type CreatedProject } from '../lib/projectAdmin';

interface Props {
  open: boolean;
  onCreated: (created: CreatedProject) => void;
  onClose: () => void;
}

export function CreateProjectModal({ open, onCreated, onClose }: Props) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createProject = useCreateProject();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      queueMicrotask(() => inputRef.current?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await createProject(trimmed);
      onCreated(created);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('errors.saveFailed');
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <dialog ref={dialogRef} className={dialogClass} onClose={onClose}>
      <form
        method="dialog"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 p-5 sm:p-6"
      >
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {t('home.newProjectTitle')}
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

        <div className="flex flex-col gap-1 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">
              {t('home.newProjectName')}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              required
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <span className="text-xs text-slate-500">
            {t('home.newProjectNameHint')}
          </span>
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
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            {t('edit.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t('home.creating') : t('home.newProjectCreate')}
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

const dialogClass =
  'w-full max-w-md rounded-2xl border-0 bg-white p-0 shadow-xl outline-none backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm m-auto';
