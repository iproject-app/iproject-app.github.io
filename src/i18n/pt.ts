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
