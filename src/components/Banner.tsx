import type { ReactNode } from 'react';

export type BannerVariant = 'muted' | 'error';

const VARIANT_CLASS: Record<BannerVariant, string> = {
  muted: 'border-slate-200 bg-white text-slate-500 shadow-sm',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
};

interface Props {
  variant?: BannerVariant;
  children: ReactNode;
}

export function Banner({ variant = 'muted', children }: Props) {
  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={`rounded-2xl border p-5 text-sm sm:p-6 ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </div>
  );
}
