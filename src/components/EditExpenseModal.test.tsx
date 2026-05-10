import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditExpenseModal } from './EditExpenseModal';
import type { Expense, ProjectData } from '../lib/types';
import { renderWithI18n } from '../test/helpers';

const buildExpense = (over: Partial<Expense> = {}): Expense => ({
  id: 'seed-01',
  date: '2026-05-04',
  category: 'Labor',
  payer: 'Shelby',
  payee: 'Francisco',
  description: 'PIX',
  amount: 500,
  currency: 'BRL',
  kind: 'expense',
  ...over,
});

const buildData = (over: Partial<ProjectData> = {}): ProjectData => ({
  slug: 'back-wall',
  name: 'Back Wall',
  currency: 'BRL',
  customCategories: [],
  contacts: [],
  expenses: [buildExpense()],
  ...over,
});

describe('EditExpenseModal', () => {
  it('renders nothing when no expense is selected', () => {
    renderWithI18n(
      <EditExpenseModal
        expense={null}
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(/edit expense/i)).not.toBeInTheDocument();
  });

  it('prefills the form from the selected expense', () => {
    const expense = buildExpense({
      payee: 'Pedro',
      amount: 99.5,
      kind: 'bill',
    });
    renderWithI18n(
      <EditExpenseModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/^Payee/)).toHaveValue('Pedro');
    expect(screen.getByLabelText(/^Amount/)).toHaveValue(99.5);
    expect(screen.getByLabelText(/Mark as bill/)).toBeChecked();
  });

  it('saves changes and calls onClose on success', async () => {
    const user = userEvent.setup();
    const expense = buildExpense();
    const data = buildData({ expenses: [expense] });
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithI18n(
      <EditExpenseModal
        expense={expense}
        data={data}
        saving={false}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    await user.clear(screen.getByLabelText(/^Payee/));
    await user.type(screen.getByLabelText(/^Payee/), 'Updated');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const next = onSave.mock.calls[0][0] as ProjectData;
    expect(next.expenses).toHaveLength(1);
    expect(next.expenses[0].payee).toBe('Updated');
    expect(next.expenses[0].id).toBe(expense.id);
    expect(onClose).toHaveBeenCalled();
  });

  it('requires a second click to confirm delete', async () => {
    const user = userEvent.setup();
    const expense = buildExpense();
    const data = buildData({ expenses: [expense] });
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithI18n(
      <EditExpenseModal
        expense={expense}
        data={data}
        saving={false}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    // First click arms the confirm state — onSave NOT yet called.
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /confirm delete/i }),
    ).toBeInTheDocument();

    // Second click commits the delete.
    await user.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const next = onSave.mock.calls[0][0] as ProjectData;
    expect(next.expenses).toHaveLength(0);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the localized validation error and does not save', async () => {
    const user = userEvent.setup();
    const expense = buildExpense();
    const onSave = vi.fn();

    renderWithI18n(
      <EditExpenseModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText(/^Payee/));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/payee is required/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('cancel calls onClose without saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    const expense = buildExpense();

    renderWithI18n(
      <EditExpenseModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('localizes labels and buttons in Portuguese', () => {
    const expense = buildExpense();
    renderWithI18n(
      <EditExpenseModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
      { language: 'pt' },
    );

    expect(
      screen.getByRole('heading', { name: 'Editar despesa' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /salvar alterações/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^excluir$/i }),
    ).toBeInTheDocument();
  });
});
