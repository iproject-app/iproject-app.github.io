export function formatMoney(amount: number, currency: string = 'BRL'): string {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  return amount.toLocaleString(locale, { style: 'currency', currency });
}

/**
 * Format an ISO date (YYYY-MM-DD) as a localized "Mon D" string in the user's
 * locale, parsing as a *local* date so we don't get the off-by-one drift that
 * `new Date(iso)` causes when the system timezone is west of UTC.
 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function todayISO(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
