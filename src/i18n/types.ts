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
  'home.newProject': string;
  'home.newProjectTitle': string;
  'home.newProjectName': string;
  'home.newProjectNameHint': string;
  'home.newProjectCreate': string;
  'home.creating': string;

  'settings.tabGeneral': string;
  'general.name': string;
  'general.slug': string;
  'general.slugHint': string;
  'general.dangerZone': string;
  'general.deleteProject': string;
  'general.deleteProjectHint': string;
  'general.deleteConfirm': string;
  'general.deleteConfirmYes': string;
  'general.deleting': string;

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

  'receipt.dropPrompt': string;
  'receipt.tapToPick': string;
  'receipt.aiHint': string;
  'receipt.processing': string;
  'receipt.attached': string;
  'receipt.duplicateAttached': string;
  'receipt.replaceHint': string;
  'receipt.errorPrefix': string;
  'receipt.viewing': string;
  'receipt.viewError': string;
  'receipt.openOriginal': string;
  'receipt.pdfFallback': string;

  'billing.outstanding': string;
  'billing.linkedToBill': string;
  'billing.linkToBill': string;
  'billing.noLinkedBill': string;
  'billing.noBillsToLink': string;

  'summary.totalSpent': string;
  'summary.contract': string;
  'summary.byCategory': string;
  'summary.byPayer': string;
  'summary.paidOnLabel': string;
  'summary.unknownPayer': string;

  'contacts.title': string;
  'contacts.button': string;
  'contacts.add': string;
  'contacts.name': string;
  'contacts.role': string;
  'contacts.aliases': string;
  'contacts.aliasesHint': string;
  'contacts.empty': string;
  'contacts.deleteContact': string;
  'contacts.normalizeButtonOne': string;
  'contacts.normalizeButtonMany': string;
  'contacts.normalizeAllUp': string;
  'contacts.normalizeConfirm': string;
  'contacts.normalizeYes': string;
  'contacts.normalizing': string;
  'contacts.normalizeHint': string;

  'settings.title': string;
  'settings.button': string;
  'settings.tabContacts': string;
  'settings.tabContract': string;
  'settings.tabPlans': string;
  'settings.placeholderPlans': string;

  'contract.amount': string;
  'contract.upfront': string;
  'contract.upfrontHint': string;
  'contract.startDate': string;
  'contract.weeks': string;
  'contract.weeklyAmount': string;
  'contract.scheduleTitle': string;
  'contract.upfrontRow': string;
  'contract.weekRow': string;
  'contract.approveAria': string;
  'contract.notConfigured': string;
  'contract.nextPayment': string;
  'contract.allComplete': string;
  'contract.paymentsRemaining': string;

  'filter.label': string;
  'filter.all': string;
  'filter.payments': string;
  'filter.bills': string;
  'filter.payerLabel': string;
  'filter.categoryLabel': string;
  'filter.allPayers': string;
  'filter.allCategories': string;
  'filter.clear': string;

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
