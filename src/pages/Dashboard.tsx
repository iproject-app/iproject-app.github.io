import { useAuth0 } from '@auth0/auth0-react';

export function Dashboard() {
  const { user } = useAuth0();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-sm text-slate-400">Welcome back</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {user?.name ?? user?.email ?? 'Friend'}
          </h1>
        </div>
        <div className="text-sm text-slate-400">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Active projects', value: '—' },
          { label: 'Open tasks', value: '—' },
          { label: 'Shipped this week', value: '—' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5"
          >
            <p className="text-sm text-slate-400">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {s.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Get started</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
          The backend isn&rsquo;t connected yet. Once the k8s API is online,
          this dashboard will pull live data via the API client at{' '}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-200">
            src/lib/api.ts
          </code>
          .
        </p>
      </section>
    </div>
  );
}
