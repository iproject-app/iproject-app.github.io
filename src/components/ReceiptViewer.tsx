import { useReceiptUrl } from '../lib/useReceiptUrl';
import { useTranslation } from '../i18n';

interface Props {
  filename: string;
  slug: string;
}

const PDF_TYPES = ['application/pdf'];

const isPdf = (filename: string, contentType: string | null) => {
  if (contentType && PDF_TYPES.includes(contentType)) return true;
  return filename.toLowerCase().endsWith('.pdf');
};

export function ReceiptViewer({ filename, slug }: Props) {
  const { t } = useTranslation();
  const { url, contentType, loading, error } = useReceiptUrl(filename, slug);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500"
      >
        {t('receipt.viewing')}
      </div>
    );
  }

  if (error || !url) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-800"
      >
        <p className="font-medium">{t('receipt.viewError')}</p>
        {error && <p className="mt-1 break-words text-rose-700/90">{error}</p>}
      </div>
    );
  }

  if (isPdf(filename, contentType)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm">
        <p className="text-slate-600">{t('receipt.pdfFallback')}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex h-9 items-center justify-center rounded-md bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700"
        >
          {t('receipt.openOriginal')}
        </a>
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <a href={url} target="_blank" rel="noreferrer" aria-label={t('receipt.openOriginal')}>
        <img
          src={url}
          alt={filename}
          className="block h-auto max-h-[60vh] w-full object-contain"
        />
      </a>
      <figcaption className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
        <span className="truncate" title={filename}>
          {filename}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-brand-600 hover:underline"
        >
          {t('receipt.openOriginal')}
        </a>
      </figcaption>
    </figure>
  );
}
