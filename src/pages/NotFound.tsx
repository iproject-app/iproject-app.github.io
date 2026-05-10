import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <p className="text-sm font-medium uppercase tracking-widest text-brand-600">
        {t('notfound.code')}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {t('notfound.title')}
      </h1>
      <p className="mt-3 text-base text-slate-600">{t('notfound.body')}</p>
      <Link
        to="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
      >
        {t('notfound.back')}
      </Link>
    </div>
  );
}
