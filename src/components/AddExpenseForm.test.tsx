import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddExpenseForm } from './AddExpenseForm';
import type { ProjectData } from '../lib/types';
import { renderWithI18n } from '../test/helpers';

const buildData = (over: Partial<ProjectData> = {}): ProjectData => ({
  slug: 'back-wall',
  name: 'Back Wall',
  currency: 'BRL',
  customCategories: [],
  contacts: [],
  expenses: [],
  ...over,
});

async function fillRequired(
  user: ReturnType<typeof userEvent.setup>,
  fields: { date: string; payee: string; amount: string },
) {
  await user.clear(screen.getByLabelText(/^Date/));
  await user.type(screen.getByLabelText(/^Date/), fields.date);
  await user.type(screen.getByLabelText(/^Payee/), fields.payee);
  await user.type(screen.getByLabelText(/^Amount/), fields.amount);
}

describe('AddExpenseForm', () => {
  it('renders collapsed by default with title and hint visible', () => {
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={vi.fn()} />,
    );
    expect(screen.getByText('Add expense')).toBeVisible();
    expect(screen.queryByLabelText(/^Date/)).not.toBeInTheDocument();
  });

  it('expands when the header is clicked', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={vi.fn()} />,
    );

    await user.click(
      screen.getByRole('button', { name: /expand add expense form/i }),
    );

    const dateField = await screen.findByLabelText(/^Date/);
    expect(dateField).toBeVisible();
    expect(dateField).toBeEnabled();
  });

  it('submits a valid entry and calls onAdd with the appended expense', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const data = buildData();
    renderWithI18n(
      <AddExpenseForm data={data} saving={false} onAdd={onAdd} />,
    );

    await user.click(
      screen.getByRole('button', { name: /expand add expense form/i }),
    );
    await user.clear(screen.getByLabelText(/^Date/));
    await user.type(screen.getByLabelText(/^Date/), '2026-05-10');
    await user.clear(screen.getByLabelText(/^Category/));
    await user.type(screen.getByLabelText(/^Category/), 'Materials');
    await user.type(screen.getByLabelText(/^Payer/), 'Joe');
    await user.type(screen.getByLabelText(/^Payee/), 'Pedro');
    await user.type(screen.getByLabelText(/^Description/), 'sand');
    await user.type(screen.getByLabelText(/^Amount/), '99.50');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const arg = onAdd.mock.calls[0][0] as ProjectData;
    expect(arg.expenses).toHaveLength(1);
    expect(arg.expenses[0]).toMatchObject({
      date: '2026-05-10',
      category: 'Materials',
      payer: 'Joe',
      payee: 'Pedro',
      description: 'sand',
      amount: 99.5,
      currency: 'BRL',
      kind: 'expense',
    });
    expect(arg.slug).toBe(data.slug);
  });

  it('marks kind=bill when the bill checkbox is ticked', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={onAdd} />,
    );

    await user.click(
      screen.getByRole('button', { name: /expand add expense form/i }),
    );
    await fillRequired(user, { date: '2026-05-10', payee: 'Quarry', amount: '500' });
    await user.click(screen.getByLabelText(/Mark as bill/));
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect((onAdd.mock.calls[0][0] as ProjectData).expenses[0].kind).toBe('bill');
  });

  it('shows the localized validation error and does not call onAdd on missing payee', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={onAdd} />,
    );

    await user.click(
      screen.getByRole('button', { name: /expand add expense form/i }),
    );
    await user.clear(screen.getByLabelText(/^Date/));
    await user.type(screen.getByLabelText(/^Date/), '2026-05-10');
    await user.type(screen.getByLabelText(/^Amount/), '50');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/payee is required/i);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows the validation error in Portuguese', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={onAdd} />,
      { language: 'pt' },
    );

    await user.click(
      screen.getByRole('button', { name: /expandir formulário/i }),
    );
    await user.clear(screen.getByLabelText(/^Data/));
    await user.type(screen.getByLabelText(/^Data/), '2026-05-10');
    await user.type(screen.getByLabelText(/^Valor/), '50');
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /beneficiário é obrigatório/i,
    );
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('surfaces a save error from onAdd', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockRejectedValue(new Error('Request failed: 500'));
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={onAdd} />,
    );

    await user.click(
      screen.getByRole('button', { name: /expand add expense form/i }),
    );
    await fillRequired(user, { date: '2026-05-10', payee: 'Pedro', amount: '50' });
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/500/);
  });
});
