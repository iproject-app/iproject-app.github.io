import { useAuth0 } from '@auth0/auth0-react';

export function Home() {
  const { user } = useAuth0();
  const greeting = user?.given_name ?? user?.nickname ?? user?.name ?? 'there';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-slate-400">Welcome back, {greeting}.</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Projects
        </h1>
      </header>

      <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-slate-300 sm:p-6">
        <p className="text-sm sm:text-base">
          Project list will appear here once the backend is wired up.
        </p>
      </div>
    </div>
  );
}
