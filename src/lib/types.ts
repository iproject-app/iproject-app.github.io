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
  plannedLabor?: number;
  claudeContext?: string;
}
