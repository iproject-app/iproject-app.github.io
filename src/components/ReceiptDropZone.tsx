import { useRef, useState, type DragEvent } from 'react';
import { useTranslation } from '../i18n';

export type ReceiptState =
  | { kind: 'idle' }
  | { kind: 'processing'; filename: string }
  | { kind: 'attached'; filename: string; duplicate?: boolean }
  | { kind: 'error'; message: string };

interface Props {
  state: ReceiptState;
  onFile: (file: File) => void;
  /** Disabled during the parent form's saving state. */
  disabled?: boolean;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

export function ReceiptDropZone({ state, onFile, disabled = false }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleFileFromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // Allow picking the same filename twice in a row by resetting the input.
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const baseTone =
    state.kind === 'error'
      ? 'border-rose-300 bg-rose-50 text-rose-800'
      : state.kind === 'attached'
        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
        : state.kind === 'processing'
          ? 'border-sky-300 bg-sky-50 text-sky-800'
          : 'border-sky-300 bg-white text-slate-700';

  const dragTone = dragging ? 'border-brand-500 bg-brand-50 text-brand-800' : '';

  return (
    <div
      role="region"
      aria-label={t('receipt.dropPrompt')}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition ${baseTone} ${dragTone} ${disabled ? 'opacity-60' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFileFromInput}
        className="sr-only"
        aria-hidden="true"
      />

      {state.kind === 'idle' && <IdleContent onClick={pick} />}
      {state.kind === 'processing' && (
        <ProcessingContent filename={state.filename} />
      )}
      {state.kind === 'attached' && (
        <AttachedContent
          filename={state.filename}
          duplicate={Boolean(state.duplicate)}
          onReplace={pick}
        />
      )}
      {state.kind === 'error' && (
        <ErrorContent message={state.message} onRetry={pick} />
      )}
    </div>
  );
}

function IdleContent({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <CameraIcon />
      <button
        type="button"
        onClick={onClick}
        className="text-base font-medium text-slate-900 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        {t('receipt.dropPrompt')}
      </button>
      <p className="text-xs text-slate-500">{t('receipt.tapToPick')}</p>
      <p className="mt-1 text-xs text-slate-500">{t('receipt.aiHint')}</p>
    </>
  );
}

function ProcessingContent({ filename }: { filename: string }) {
  const { t } = useTranslation();
  return (
    <>
      <Spinner />
      <p
        role="status"
        aria-live="polite"
        className="text-sm font-medium text-sky-900"
      >
        {t('receipt.processing')}
      </p>
      <p className="truncate text-xs text-sky-800/80" title={filename}>
        {filename}
      </p>
    </>
  );
}

function AttachedContent({
  filename,
  duplicate,
  onReplace,
}: {
  filename: string;
  duplicate: boolean;
  onReplace: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <CheckIcon />
      <p className="text-sm font-medium">
        {t('receipt.attached', { filename })}
      </p>
      {duplicate && (
        <p className="text-xs text-emerald-700/80">
          {t('receipt.duplicateAttached')}
        </p>
      )}
      <button
        type="button"
        onClick={onReplace}
        className="text-xs text-emerald-700 underline-offset-2 hover:underline"
      >
        {t('receipt.replaceHint')}
      </button>
    </>
  );
}

function ErrorContent({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <p role="alert" className="text-sm font-medium">
        {t('receipt.errorPrefix')} {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs text-rose-800 underline-offset-2 hover:underline"
      >
        {t('receipt.tapToPick')}
      </button>
    </>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        d="M3 7h3l2-3h8l2 3h3v12H3V7z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 text-emerald-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 12l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 animate-spin text-sky-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
    </svg>
  );
}
