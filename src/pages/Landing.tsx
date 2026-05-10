import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import { LoginButton } from '../components/LoginButton';

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth0();

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(47,123,255,0.18),transparent_70%)]"
      />
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-12 pb-16 text-center sm:px-6 sm:pt-20 sm:pb-24 lg:pt-28">
        <img
          src="/logo-transparent.png"
          alt="iproject.app"
          className="mb-6 h-20 w-20 sm:h-24 sm:w-24"
        />
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Project intelligence,{' '}
          <span className="text-brand-400">on every device.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
          A modern workspace for planning, tracking, and shipping work — built
          mobile-first and ready wherever you are.
        </p>
        <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          {!isLoading && !isAuthenticated && (
            <>
              <LoginButton className="inline-flex h-12 items-center justify-center rounded-lg bg-brand-500 px-6 text-base font-medium text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300" />
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-6 text-base font-medium text-slate-100 transition hover:bg-slate-800"
              >
                Learn more
              </a>
            </>
          )}
          {!isLoading && isAuthenticated && (
            <Link
              to="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-brand-500 px-6 text-base font-medium text-white shadow-sm transition hover:bg-brand-400"
            >
              Open dashboard
            </Link>
          )}
        </div>
      </section>

      <section
        id="features"
        className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 pb-16 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 lg:pb-24"
      >
        {[
          {
            title: 'Plan',
            body: 'Break work into clear, demonstrable steps and stay aligned across the team.',
          },
          {
            title: 'Track',
            body: 'See progress at a glance — on a phone, a tablet, or a wall-sized monitor.',
          },
          {
            title: 'Ship',
            body: 'Move from idea to delivery with a workflow that respects your time.',
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
              {f.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
