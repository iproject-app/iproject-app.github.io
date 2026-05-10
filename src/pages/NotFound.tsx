import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <p className="text-sm font-medium uppercase tracking-widest text-brand-600">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 text-base text-slate-600">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
      >
        Back home
      </Link>
    </div>
  );
}
