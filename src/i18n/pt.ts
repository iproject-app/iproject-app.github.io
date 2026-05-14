import type { Translations } from './types';

export const pt: Translations = {
  'nav.logout': 'Sair',
  'nav.languageLabel': 'Trocar idioma',

  'home.welcome': 'Bem-vindo de volta, {name}.',
  'home.projects': 'Projetos',
  'home.loadingProjects': 'Carregando projetos…',
  'home.errorLoadingProjects': 'Não foi possível carregar os projetos.',
  'home.noProjects': 'Nenhum projeto ainda.',
  'home.expenses': 'Despesas',
  'home.total': 'Total',
  'home.newProject': '+ Novo projeto',
  'home.newProjectTitle': 'Novo projeto',
  'home.newProjectName': 'Nome',
  'home.newProjectNameHint':
    'Um slug amigável de URL é gerado a partir do nome.',
  'home.newProjectCreate': 'Criar',
  'home.creating': 'Criando…',

  'project.backToList': '← Todos os projetos',
  'project.entriesCountSingular': '{count} lançamento',
  'project.entriesCountPlural': '{count} lançamentos',
  'project.loading': 'Carregando projeto…',
  'project.errorLoading': 'Não foi possível carregar o projeto.',
  'project.noEntries': 'Nenhum lançamento ainda.',

  'add.title': 'Adicionar despesa',
  'add.hint':
    'Registre um pagamento ou orçamento — deixe o pagador em branco para marcar como orçamento.',
  'add.expand': 'Expandir formulário de despesa',
  'add.collapse': 'Recolher formulário de despesa',
  'add.clear': 'Limpar',
  'add.saving': 'Salvando…',
  'add.submit': 'Adicionar despesa',

  'edit.title': 'Editar despesa',
  'edit.save': 'Salvar alterações',
  'edit.cancel': 'Cancelar',
  'edit.delete': 'Excluir',
  'edit.confirmDelete': 'Confirmar exclusão',
  'edit.deleting': 'Excluindo…',
  'edit.close': 'Fechar diálogo',

  'detail.title': 'Detalhes',
  'detail.edit': 'Editar',
  'detail.payer': 'Pagador',
  'detail.payee': 'Beneficiário',
  'detail.dash': '—',
  'detail.confirmDeleteTitle': 'Excluir este lançamento?',
  'detail.confirmDeleteBody': 'Esta ação não pode ser desfeita.',
  'detail.confirmDeleteYes': 'Sim, excluir',

  'receipt.dropPrompt': 'Solte um recibo aqui',
  'receipt.tapToPick': 'ou toque para escolher um arquivo',
  'receipt.aiHint':
    'A IA extrairá data, valor, pagador, beneficiário e categoria.',
  'receipt.processing': 'Lendo o recibo com IA…',
  'receipt.attached': 'Anexado: {filename}',
  'receipt.duplicateAttached':
    'Este recibo já estava anexado a outro lançamento — usando o mesmo arquivo.',
  'receipt.replaceHint': 'Solte outro para substituir.',
  'receipt.errorPrefix': 'Não foi possível processar o recibo:',
  'receipt.viewing': 'Carregando recibo…',
  'receipt.viewError': 'Não foi possível carregar o recibo.',
  'receipt.openOriginal': 'Abrir original',
  'receipt.pdfFallback': 'Abrir o PDF anexado em uma nova aba.',

  'billing.outstanding': 'A pagar',
  'billing.linkedToBill': 'Vinculado ao orçamento',
  'billing.linkToBill': 'Vincular ao orçamento',
  'billing.noLinkedBill': '— sem orçamento vinculado —',
  'billing.noBillsToLink':
    'Nenhum orçamento em aberto para vincular.',

  'summary.totalSpent': 'Total gasto',
  'summary.contract': 'Contrato',
  'summary.byCategory': 'Por categoria',
  'summary.byPayer': 'Por pagador',
  'summary.paidOnLabel': 'Pago em {category}',
  'summary.unknownPayer': 'Desconhecido',

  'contacts.title': 'Contatos',
  'contacts.button': 'Contatos ({count})',
  'contacts.add': 'Adicionar contato',
  'contacts.name': 'Nome',
  'contacts.role': 'Função',
  'contacts.aliases': 'Apelidos',
  'contacts.aliasesHint':
    'Separados por vírgula. A IA usa para normalizar variações nos recibos.',
  'contacts.empty': 'Nenhum contato ainda.',
  'contacts.deleteContact': 'Excluir contato',
  'contacts.normalizeButtonOne': 'Normalizar 1 lançamento existente',
  'contacts.normalizeButtonMany': 'Normalizar {count} lançamentos existentes',
  'contacts.normalizeAllUp':
    'Todos os lançamentos existentes já têm os nomes canônicos.',
  'contacts.normalizeConfirm':
    'Reescrever pagador/beneficiário em {count} lançamentos para os nomes canônicos?',
  'contacts.normalizeYes': 'Sim, normalizar',
  'contacts.normalizing': 'Normalizando…',
  'contacts.normalizeHint':
    'Aplica suas regras de apelidos aos lançamentos já salvos deste projeto.',

  'settings.title': 'Configurações do projeto',
  'settings.button': 'Configurações',
  'settings.tabGeneral': 'Geral',
  'settings.tabContacts': 'Contatos',
  'settings.tabContract': 'Contrato',
  'settings.tabPlans': 'Plantas',
  'settings.placeholderPlans':
    'Desenhos arquitetônicos, fotos de progresso, documentos de planejamento. (Em breve.)',

  'general.name': 'Nome do projeto',
  'general.slug': 'Slug da URL',
  'general.slugHint':
    'Definido pelo servidor quando o projeto é criado.',
  'general.dangerZone': 'Zona de perigo',
  'general.deleteProject': 'Excluir projeto',
  'general.deleteProjectHint':
    'Move este projeto para a lixeira do servidor. Reversível por um operador.',
  'general.deleteConfirm':
    'Excluir este projeto? Isso oculta todas as despesas e recibos.',
  'general.deleteConfirmYes': 'Sim, excluir',
  'general.deleting': 'Excluindo…',

  'contract.amount': 'Valor do contrato',
  'contract.upfront': 'Pagamento inicial',
  'contract.upfrontHint':
    'Os pagamentos semanais usam (contrato − inicial).',
  'contract.startDate': 'Data de início',
  'contract.weeks': 'Número de semanas',
  'contract.weeklyAmount': 'Valor semanal',
  'contract.scheduleTitle': 'Cronograma de pagamentos',
  'contract.upfrontRow': 'Inicial (começo do contrato)',
  'contract.weekRow': 'Semana {n}',
  'contract.approveAria': 'Aprovar {label}',
  'contract.notConfigured':
    'Defina o valor do contrato, a data de início e o número de semanas para gerar o cronograma.',
  'contract.nextPayment': 'Próximo: {amount} em {date}',
  'contract.allComplete': 'Todos os checkpoints aprovados.',

  'filter.label': 'Filtro',
  'filter.all': 'Todos',
  'filter.payments': 'Apenas pagamentos',
  'filter.bills': 'Apenas orçamentos',
  'filter.payerLabel': 'Pagador',
  'filter.categoryLabel': 'Categoria',
  'filter.allPayers': 'Todos os pagadores',
  'filter.allCategories': 'Todas as categorias',
  'filter.clear': 'Limpar filtros',

  'fields.date': 'Data',
  'fields.category': 'Categoria',
  'fields.payer': 'Pagador',
  'fields.payerHint': 'Deixe em branco para um orçamento.',
  'fields.payee': 'Beneficiário',
  'fields.description': 'Descrição',
  'fields.amount': 'Valor',
  'fields.currency': 'Moeda',
  'fields.markAsBill':
    'Marcar como orçamento — valor devido, ainda não pago.',

  'errors.amountPositive': 'O valor deve ser um número positivo.',
  'errors.payeeRequired': 'Beneficiário é obrigatório.',
  'errors.dateRequired': 'Data é obrigatória.',
  'errors.saveFailed': 'Falha ao salvar',

  'table.date': 'Data',
  'table.category': 'Categoria',
  'table.payerToPayee': 'Pagador → Beneficiário',
  'table.description': 'Descrição',
  'table.amount': 'Valor',

  'badge.bill': 'Orçamento',
  'receiptLink.label': 'recibo',

  'notfound.code': '404',
  'notfound.title': 'Página não encontrada',
  'notfound.body': 'A página que você procura não existe ou foi movida.',
  'notfound.back': 'Voltar ao início',
};
