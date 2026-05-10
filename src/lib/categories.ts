export const STANDARD_CATEGORIES = [
  'Labor',
  'Materials',
  'Services',
  'Utilities',
  'Garbage',
  'Other',
] as const;

export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'CAD'] as const;

const CATEGORY_PALETTE: Record<string, string> = {
  labor: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  materials: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  services: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  utilities: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  garbage: 'bg-stone-100 text-stone-700 ring-1 ring-stone-200',
  other: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

const FALLBACK_CATEGORY_CLASS =
  'bg-slate-100 text-slate-700 ring-1 ring-slate-200';

export function categoryClass(category: string): string {
  return CATEGORY_PALETTE[category.toLowerCase()] ?? FALLBACK_CATEGORY_CLASS;
}

/**
 * Merge a project's custom categories with the standard list, dedup-preserving
 * the first occurrence's casing.
 */
export function categorySuggestions(custom: readonly string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of [...custom, ...STANDARD_CATEGORIES]) {
    const k = c.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}
