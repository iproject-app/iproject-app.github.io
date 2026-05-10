import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseDetailModal } from './ExpenseDetailModal';
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

describe('ExpenseDetailModal', () => {
  it('renders nothing when no expense is selected', () => {
    renderWithI18n(
      <ExpenseDetailModal
        expense={null}
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole('heading', { name: /details/i })).not.toBeInTheDocument();
  });

  it('opens in view mode showing read-only details', () => {
    const expense = buildExpense({ payee: 'Pedro', amount: 99.5 });
    renderWithI18n(
      <ExpenseDetailModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: /details/i })).toBeVisible();
    // Read-only — no inputs are rendered.
    expect(screen.queryByLabelText(/^Payee/)).not.toBeInTheDocument();
    // Details visible.
    expect(screen.getByText('Pedro')).toBeVisible();
    expect(screen.getByText(/R\$\s?99,50/)).toBeVisible();
  });

  it('switches to edit mode when the pencil button is clicked', async () => {
    const user = userEvent.setup();
    const expense = buildExpense();
    renderWithI18n(
      <ExpenseDetailModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // Pencil icon button (aria-label "Edit")
    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    // Title flips and form fields appear.
    expect(screen.getByRole('heading', { name: /edit expense/i })).toBeVisible();
    expect(screen.getByLabelText(/^Payee/)).toHaveValue('Francisco');
  });

  it('cancel from edit returns to view mode without saving', async () => {
    const user = userEvent.setup();
    const expense = buildExpense();
    const onSave = vi.fn();
    renderWithI18n(
      <ExpenseDetailModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/^Payee/));
    await user.type(screen.getByLabelText(/^Payee/), 'Mistake');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /details/i })).toBeVisible();
    // The original payee is still shown in view mode.
    expect(screen.getByText('Francisco')).toBeVisible();
  });

  it('saves edits and closes on success', async () => {
    const user = userEvent.setup();
    const expense = buildExpense();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithI18n(
      <ExpenseDetailModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/^Payee/));
    await user.type(screen.getByLabelText(/^Payee/), 'Updated');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0][0] as ProjectData).expenses[0].payee).toBe(
      'Updated',
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('delete in view mode requires a second click to confirm', async () => {
    const user = userEvent.setup();
    const expense = buildExpense();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithI18n(
      <ExpenseDetailModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /confirm delete/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0][0] as ProjectData).expenses).toHaveLength(0);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the localized validation error in edit mode', async () => {
    const user = userEvent.setup();
    const expense = buildExpense();
    const onSave = vi.fn();

    renderWithI18n(
      <ExpenseDetailModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/^Payee/));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/payee is required/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('localizes the heading and pencil label in Portuguese', async () => {
    const user = userEvent.setup();
    const expense = buildExpense();
    renderWithI18n(
      <ExpenseDetailModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
      { language: 'pt' },
    );

    expect(screen.getByRole('heading', { name: 'Detalhes' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    expect(screen.getByRole('heading', { name: 'Editar despesa' })).toBeVisible();
  });

  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const expense = buildExpense();
    renderWithI18n(
      <ExpenseDetailModal
        expense={expense}
        data={buildData({ expenses: [expense] })}
        saving={false}
        onSave={vi.fn()}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /close dialog/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
