import type { Contact, Expense } from './types';

/**
 * Resolve a raw name to its canonical form via the contacts list. Matches
 * (case-insensitive, trimmed) against the contact's `name` first, then any
 * of its `aliases`. Returns the input unchanged when there's no match.
 *
 * Mirrors `server.py::normalize_contact_name` so the same name written into
 * the form by hand normalizes the same way as one extracted from a receipt.
 */
export function normalizeContactName(
  name: string | null | undefined,
  contacts: readonly Contact[],
): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  for (const c of contacts) {
    if (c.name.toLowerCase() === lower) return c.name;
    if (c.aliases?.some((a) => a.trim().toLowerCase() === lower)) return c.name;
  }
  return trimmed;
}

/** Apply alias normalization across an entire expense list. Identity-preserves
 *  individual entries when no change would happen, so the returned array has
 *  the same reference identity per expense where possible. */
export function normalizeExpenses(
  expenses: readonly Expense[],
  contacts: readonly Contact[],
): Expense[] {
  return expenses.map((e) => {
    const payer = normalizeContactName(e.payer, contacts);
    const payee = normalizeContactName(e.payee, contacts);
    if (payer === e.payer && payee === e.payee) return e;
    return { ...e, payer, payee };
  });
}

/** How many expenses would have their payer or payee rewritten if we applied
 *  the alias rules. Each expense counts at most once even if both fields move. */
export function countNameChanges(
  expenses: readonly Expense[],
  contacts: readonly Contact[],
): number {
  let count = 0;
  for (const e of expenses) {
    const payer = normalizeContactName(e.payer, contacts);
    const payee = normalizeContactName(e.payee, contacts);
    if (payer !== e.payer || payee !== e.payee) count += 1;
  }
  return count;
}

/** De-duplicated list of contact names + aliases for autocomplete. Returned
 *  alphabetically so the dropdown order is predictable. */
export function contactSuggestions(contacts: readonly Contact[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };
  for (const c of contacts) {
    add(c.name);
    for (const a of c.aliases ?? []) add(a);
  }
  return out.sort((a, b) => a.localeCompare(b));
}
