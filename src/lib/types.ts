export interface Project {
  slug: string;
  name: string;
  expenseCount: number;
  total: number;
}

export interface ProjectListResponse {
  projects: Project[];
}

export type ExpenseKind = 'expense' | 'bill';

export interface Expense {
  id: string;
  date: string;
  category: string;
  payer: string;
  payee: string;
  description: string;
  amount: number;
  currency?: string;
  fxRate?: number;
  fxRateDate?: string;
  fxRateSource?: string;
  receipt?: string;
  kind?: ExpenseKind;
  linkedTo?: string;
}

export interface Contact {
  id: string;
  name: string;
  role?: string;
  aliases?: string[];
}

export interface ProjectData {
  slug: string;
  name: string;
  currency: string;
  expenses: Expense[];
  customCategories: string[];
  contacts: Contact[];
  /** Labor budget — the contract amount to apportion across the schedule. */
  plannedLabor?: number;
  /** Optional upfront / start-of-work payment, subtracted from the contract
   *  amount before apportioning across weeks. */
  contractUpfront?: number;
  /** ISO date (YYYY-MM-DD) when the contract starts. Anchors the schedule. */
  contractStartDate?: string;
  /** Number of weekly checkpoints. */
  contractWeeks?: number;
  /** Keys of approved checkpoints (e.g. 'upfront', 'week_0', 'week_1'). The
   *  schedule helpers in lib/schedule.ts produce the matching keys. */
  approvedCheckpoints?: string[];
  claudeContext?: string;
}
