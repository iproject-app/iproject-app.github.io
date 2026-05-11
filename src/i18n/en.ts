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

  'edit.title': 'Edit expense',
  'edit.save': 'Save changes',
  'edit.cancel': 'Cancel',
  'edit.delete': 'Delete',
  'edit.confirmDelete': 'Confirm delete',
  'edit.deleting': 'Deleting…',
  'edit.close': 'Close dialog',

  'detail.title': 'Details',
  'detail.edit': 'Edit',
  'detail.payer': 'Payer',
  'detail.payee': 'Payee',
  'detail.dash': '—',
  'detail.confirmDeleteTitle': 'Delete this entry?',
  'detail.confirmDeleteBody': "This can't be undone.",
  'detail.confirmDeleteYes': 'Yes, delete',

  'receipt.dropPrompt': 'Drop a receipt here',
  'receipt.tapToPick': 'or tap to choose a file',
  'receipt.aiHint':
    'AI will extract date, amount, payer, payee, and category.',
  'receipt.processing': 'Reading receipt with AI…',
  'receipt.attached': 'Attached: {filename}',
  'receipt.duplicateAttached':
    'This receipt was already attached to another entry — using the same file.',
  'receipt.replaceHint': 'Drop another to replace.',
  'receipt.errorPrefix': "Couldn't process receipt:",
  'receipt.viewing': 'Loading receipt…',
  'receipt.viewError': "Couldn't load receipt.",
  'receipt.openOriginal': 'Open original',
  'receipt.pdfFallback': 'Open the attached PDF in a new tab.',

  'billing.outstanding': 'Outstanding',
  'billing.linkedToBill': 'Linked to bill',
  'billing.linkToBill': 'Link to bill',
  'billing.noLinkedBill': '— no linked bill —',
  'billing.noBillsToLink':
    'No open bills to link to.',

  'summary.totalSpent': 'Total spent',
  'summary.contract': 'Contract',
  'summary.byCategory': 'By category',
  'summary.byPayer': 'By payer',
  'summary.paidOnLabel': 'Paid on {category}',
  'summary.unknownPayer': 'Unknown',

  'contacts.title': 'Contacts',
  'contacts.button': 'Contacts ({count})',
  'contacts.add': 'Add contact',
  'contacts.name': 'Name',
  'contacts.role': 'Role',
  'contacts.aliases': 'Aliases',
  'contacts.aliasesHint':
    'Comma-separated. AI uses these to normalize name variants on receipts.',
  'contacts.empty': 'No contacts yet.',
  'contacts.deleteContact': 'Delete contact',

  'settings.title': 'Project settings',
  'settings.button': 'Settings',
  'settings.tabContacts': 'Contacts',
  'settings.tabContracts': 'Contracts',
  'settings.tabPlans': 'Plans',
  'settings.placeholderContracts':
    "Upload contract documents here once we wire storage in. (Coming soon.)",
  'settings.placeholderPlans':
    'Architectural drawings, photos of progress, planning documents. (Coming soon.)',

  'filter.label': 'Filter',
  'filter.all': 'All',
  'filter.payments': 'Payments only',
  'filter.bills': 'Bills only',
  'filter.payerLabel': 'Payer',
  'filter.categoryLabel': 'Category',
  'filter.allPayers': 'All payers',
  'filter.allCategories': 'All categories',
  'filter.clear': 'Clear filters',

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
