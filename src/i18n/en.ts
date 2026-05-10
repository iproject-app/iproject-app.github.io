import type { Translations } from './types';

export const en: Translations = {
  'nav.logout': 'Log out',
  'nav.languageLabel': 'Switch language',

  'home.welcome': 'Welcome back, {name}.',
  'home.projects': 'Projects',
  'home.loadingProjects': 'Loading projects…',
  'home.errorLoadingProjects': "Couldn't load projects.",
  'home.noProjects': 'No projects yet.',
  'home.expenses': 'Expenses',
  'home.total': 'Total',

  'project.backToList': '← All projects',
  'project.entriesCountSingular': '{count} entry',
  'project.entriesCountPlural': '{count} entries',
  'project.loading': 'Loading project…',
  'project.errorLoading': "Couldn't load project.",
  'project.noEntries': 'No entries yet.',

  'add.title': 'Add expense',
  'add.hint':
    'Record a payment or quote — leave the payer blank to mark it as a bill.',
  'add.expand': 'Expand add expense form',
  'add.collapse': 'Collapse add expense form',
  'add.clear': 'Clear',
  'add.saving': 'Saving…',
  'add.submit': 'Add expense',

  'fields.date': 'Date',
  'fields.category': 'Category',
  'fields.payer': 'Payer',
  'fields.payerHint': 'Leave blank for a bill / quote.',
  'fields.payee': 'Payee',
  'fields.description': 'Description',
  'fields.amount': 'Amount',
  'fields.currency': 'Currency',
  'fields.markAsBill':
    'Mark as bill (orçamento) — money owed, not yet paid.',

  'errors.amountPositive': 'Amount must be a positive number.',
  'errors.payeeRequired': 'Payee is required.',
  'errors.dateRequired': 'Date is required.',
  'errors.saveFailed': 'Save failed',

  'table.date': 'Date',
  'table.category': 'Category',
  'table.payerToPayee': 'Payer → Payee',
  'table.description': 'Description',
  'table.amount': 'Amount',

  'badge.bill': 'Bill',
  'receiptLink.label': 'receipt',

  'notfound.code': '404',
  'notfound.title': 'Page not found',
  'notfound.body': "The page you're looking for doesn't exist or has moved.",
  'notfound.back': 'Back home',
};
