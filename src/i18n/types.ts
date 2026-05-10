export type Language = 'en' | 'pt';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'pt'];

/**
 * Flat dictionary keyed by dot-namespaced strings. The `en` dictionary defines
 * the canonical key set; all other dictionaries must satisfy the same shape
 * (enforced by `Translations` below).
 */
export interface Translations {
  'nav.logout': string;
  'nav.languageLabel': string;

  'home.welcome': string;
  'home.projects': string;
  'home.loadingProjects': string;
  'home.errorLoadingProjects': string;
  'home.noProjects': string;
  'home.expenses': string;
  'home.total': string;

  'project.backToList': string;
  'project.entriesCountSingular': string;
  'project.entriesCountPlural': string;
  'project.loading': string;
  'project.errorLoading': string;
  'project.noEntries': string;

  'add.title': string;
  'add.hint': string;
  'add.expand': string;
  'add.collapse': string;
  'add.clear': string;
  'add.saving': string;
  'add.submit': string;

  'edit.title': string;
  'edit.save': string;
  'edit.cancel': string;
  'edit.delete': string;
  'edit.confirmDelete': string;
  'edit.deleting': string;
  'edit.close': string;

  'detail.title': string;
  'detail.edit': string;
  'detail.payer': string;
  'detail.payee': string;
  'detail.dash': string;
  'detail.confirmDeleteTitle': string;
  'detail.confirmDeleteBody': string;
  'detail.confirmDeleteYes': string;

  'fields.date': string;
  'fields.category': string;
  'fields.payer': string;
  'fields.payerHint': string;
  'fields.payee': string;
  'fields.description': string;
  'fields.amount': string;
  'fields.currency': string;
  'fields.markAsBill': string;

  'errors.amountPositive': string;
  'errors.payeeRequired': string;
  'errors.dateRequired': string;
  'errors.saveFailed': string;

  'table.date': string;
  'table.category': string;
  'table.payerToPayee': string;
  'table.description': string;
  'table.amount': string;

  'badge.bill': string;
  'receiptLink.label': string;

  'notfound.code': string;
  'notfound.title': string;
  'notfound.body': string;
  'notfound.back': string;
}

export type TranslationKey = keyof Translations;
