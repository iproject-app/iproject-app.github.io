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

  'bid.title': string;
  'bid.subtitle': string;
  'bid.backHome': string;
  'bid.job': string;
  'bid.area': string;
  'bid.laborSection': string;
  'bid.colStage': string;
  'bid.colQty': string;
  'bid.colDailyCost': string;
  'bid.colDailyProd': string;
  'bid.colPerUnit': string;
  'bid.colSubtotal': string;
  'bid.stage.marcacao': string;
  'bid.stage.alvenaria': string;
  'bid.stage.vergas': string;
  'bid.stage.chapisco': string;
  'bid.stage.reboco': string;
  'bid.materialsSection': string;
  'bid.materialsCost': string;
  'bid.materialsMarkup': string;
  'bid.bdi': string;
  'bid.summary': string;
  'bid.laborTotal': string;
  'bid.materialsWithMarkup': string;
  'bid.bdiAmount': string;
  'bid.total': string;
  'bid.perM2': string;
  'bid.bidType': string;
  'bid.inputs': string;
  'bid.breakdown': string;
  'bid.componentsHint': string;
  'bid.include': string;
  'bid.type.external_security_wall': string;
  'bid.stage.foundation': string;
  'bid.stage.demolition': string;
  'bid.stage.debris_removal': string;
  'bid.param.lengthM': string;
  'bid.param.heightM': string;
  'bid.param.orientation': string;
  'bid.param.orientation.on_edge': string;
  'bid.param.orientation.flat': string;
  'bid.param.openingsAreaM2': string;
  'bid.param.openingsCount': string;
  'bid.param.retaining': string;
  'bid.param.reinforcementFactor': string;
  'bid.param.hasExistingStructure': string;
  'bid.param.demolitionAreaM2': string;
  'bid.param.debrisCacambas': string;
  'bid.param.openings': string;
  'bid.param.openingWidth': string;
  'bid.param.openingHeight': string;
  'bid.param.openingArea': string;
  'bid.help.openings': string;
  'bid.help.orientation': string;
  'bid.help.retaining': string;
  'bid.help.reinforcementFactor': string;
  'bid.help.debrisCacambas': string;
  'bid.param.demoLengthM': string;
  'bid.param.demoHeightM': string;
  'bid.addRow': string;
  'bid.removeRow': string;
  'bid.colConsumption': string;
  'bid.colLaborPerUnit': string;
  'bid.colDirectPerUnit': string;
  'bid.directTotal': string;
  'bid.mathHint': string;
  'bid.bom': string;
  'bid.bomHint': string;
  'bid.colMaterial': string;
  'bid.colUnitPrice': string;
  'bid.materialsFromBom': string;
  'bid.material.concreto': string;
  'bid.material.bloco': string;
  'bid.material.argamassa_assent': string;
  'bid.material.verga': string;
  'bid.material.argamassa_chapisco': string;
  'bid.material.argamassa_reboco': string;
  'bid.param.blockType': string;
  'bid.param.blockType.solid_clay': string;
  'bid.param.blockType.baiano': string;
  'bid.param.blockType.baianinho': string;
  'bid.param.blockType.laminado_21': string;
  'bid.param.blockType.ecologico': string;
  'bid.param.blockType.adobe': string;
  'bid.param.blockType.tijolo_branco': string;
  'bid.param.blockType.concrete_vedacao': string;
  'bid.param.blockType.concrete_estrutural': string;
  'bid.help.blockType': string;
  'bid.param.footingWidthM': string;
  'bid.help.footingWidthM': string;
  'bid.param.structuralPosts': string;
  'bid.help.structuralPosts': string;
  'bid.param.postSpacingM': string;
  'bid.help.postSpacingM': string;
  'bid.param.postWidthM': string;
  'bid.help.postWidthM': string;
  'bid.stage.pilares': string;
  'bid.stage.pintura': string;
  'bid.material.selador': string;
  'bid.material.tinta': string;
  'bid.stage.baldrame': string;
  'bid.stage.cintaMeio': string;
  'bid.stage.cintaTopo': string;
  'bid.material.aco': string;
  'bid.param.beamWidthM': string;
  'bid.help.beamWidthM': string;
  'bid.param.beamHeightM': string;
  'bid.help.beamHeightM': string;
  'bid.param.rebarKgPerM': string;
  'bid.help.rebarKgPerM': string;
}

export type TranslationKey = keyof Translations;
