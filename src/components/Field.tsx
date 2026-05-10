import type { ReactNode } from 'react';

interface Props {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

/** Form field wrapper: a labelled input with an optional inline hint. The
 *  whole label is the click target so the underlying input picks up focus. */
export function Field({ label, hint, className, children }: Props) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className ?? ''}`}>
      <span className="font-medium text-slate-700">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-slate-500">· {hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

export const fieldInputClass =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
